<?php

declare(strict_types=1);

namespace Neos\RedirectHandler\Ui\Controller;

/*
 * This file is part of the Neos.RedirectHandler.Ui package.
 *
 * (c) Contributors of the Neos Project - www.neos.io
 *
 * This package is Open Source Software. For the full copyright and license
 * information, please view the LICENSE file which was distributed with this
 * source code.
 */

use DateTime;
use Exception;
use League\Csv\CannotInsertRecord;
use League\Csv\Exception as CsvException;
use League\Csv\Reader;
use Neos\Error\Messages\Message;
use Neos\Flow\Annotations as Flow;
use Neos\Flow\I18n\Exception\IndexOutOfBoundsException;
use Neos\Flow\I18n\Exception\InvalidFormatPlaceholderException;
use Neos\Flow\I18n\Service as LocalizationService;
use Neos\Flow\I18n\Translator;
use Neos\Flow\Mvc\Exception\StopActionException;
use Neos\Flow\Mvc\View\JsonView;
use Neos\Flow\ResourceManagement\Exception as ResourceException;
use Neos\Flow\ResourceManagement\PersistentResource;
use Neos\Flow\ResourceManagement\ResourceManager;
use Neos\Flow\Utility\Environment;
use Neos\Fusion\View\FusionView;
use Neos\Neos\Controller\Module\AbstractModuleController;
use Neos\Flow\Persistence\PersistenceManagerInterface;
use Neos\Flow\Security\Context as SecurityContext;

use Neos\Neos\Domain\Model\Domain;
use Neos\Neos\Domain\Repository\DomainRepository;
use Neos\RedirectHandler\RedirectInterface;
use Neos\RedirectHandler\Service\RedirectExportService;
use Neos\RedirectHandler\Service\RedirectImportService;
use Neos\RedirectHandler\Storage\RedirectStorageInterface;

/**
 * @Flow\Scope("singleton")
 */
class ModuleController extends AbstractModuleController
{
    /**
     * @var FusionView
     */
    protected $view;

    /**
     * @var string
     */
    protected $defaultViewObjectName = FusionView::class;

    /**
     * @var array
     */
    protected $supportedMediaTypes = ['application/json', 'text/html'];

    /**
     * @var array
     */
    protected $viewFormatToObjectNameMap = [
        'html' => FusionView::class,
        'json' => JsonView::class,
    ];

    /**
     * @Flow\Inject
     * @var SecurityContext
     */
    protected $securityContext;

    /**
     * @Flow\Inject
     * @var RedirectStorageInterface
     */
    protected $redirectStorage;

    /**
     * @Flow\Inject
     * @var PersistenceManagerInterface
     */
    protected $persistenceManager;

    /**
     * @Flow\Inject
     * @var Translator
     */
    protected $translator;

    /**
     * @Flow\Inject
     * @var LocalizationService
     */
    protected $localizationService;

    /**
     * @Flow\Inject
     * @var RedirectExportService
     */
    protected $redirectExportService;

    /**
     * @Flow\Inject
     * @var RedirectImportService
     */
    protected $redirectImportService;

    /**
     * @Flow\Inject
     * @var Environment
     */
    protected $environment;

    /**
     * @Flow\Inject
     * @var ResourceManager
     */
    protected $resourceManager;

    /**
     * @Flow\Inject
     * @var DomainRepository
     */
    protected $domainRepository;

    /**
     * @Flow\InjectConfiguration(path="validation", package="Neos.RedirectHandler")
     * @var array
     */
    protected $validationOptions;

    /**
     * Renders the list of all redirects and allows modifying them.
     */
    public function indexAction(): void
    {
        $redirects = $this->redirectStorage->getAll();
        $csrfToken = $this->securityContext->getCsrfProtectionToken();
        $flashMessages = $this->controllerContext->getFlashMessageContainer()->getMessagesAndFlush();
        $currentLocale = $this->localizationService->getConfiguration()->getCurrentLocale();
        $usedHostOptions = [];

        // Serialize redirects for the filterable list in the frontend
        // TODO: Provide the list via a json action to the frontend for async loading
        $redirectsJson = '';
        /** @var RedirectInterface $redirect */
        foreach ($redirects as $redirect) {
            $usedHostOptions[] = $redirect->getHost();
            $redirectsJson .= json_encode($redirect) . ',';
        }
        $redirectsJson = '[' . trim($redirectsJson, ',') . ']';

        $domainOptions = array_map(function (Domain $domain) {
            return $domain->getHostname();
        }, $this->domainRepository->findAll()->toArray());

        $hostOptions = array_filter(array_unique(array_merge($domainOptions, $usedHostOptions)));
        sort($hostOptions);

        $this->view->assignMultiple([
            'redirectsJson' => $redirectsJson,
            'hostOptions' => $hostOptions,
            'flashMessages' => $flashMessages,
            'csrfToken' => $csrfToken,
            'locale' => $currentLocale,
        ]);
    }

    /**
     * @param string|null $startDateTime
     * @param string|null $endDateTime
     * @return array
     */
    protected function processRedirectStartAndEndDate(string $startDateTime = null, string $endDateTime = null): array
    {
        $valid = true;
        if (empty($startDateTime)) {
            $startDateTime = null;
        } else {
            try {
                $startDateTime = new \DateTime($startDateTime);
            } catch (Exception $e) {
                $valid = false;
                $this->addFlashMessage('', $this->translateById('error.invalidStartDateTime'), Message::SEVERITY_ERROR);
            }
        }
        if (empty($endDateTime)) {
            $endDateTime = null;
        } else {
            try {
                $endDateTime = new \DateTime($endDateTime);
            } catch (Exception $e) {
                $valid = false;
                $this->addFlashMessage('', $this->translateById('error.invalidEndDateTime'), Message::SEVERITY_ERROR);
            }
        }

        return [$startDateTime, $endDateTime, $valid];
    }

    /**
     * Creates a single redirect and goes back to the list
     *
     * @return void
     * @throws StopActionException
     */
    public function createAction(): void
    {
        [
            'host' => $host,
            'sourceUriPath' => $sourceUriPath,
            'targetUriPath' => $targetUriPath,
            'statusCode' => $statusCode,
            'startDateTime' => $startDateTime,
            'endDateTime' => $endDateTime,
            'comment' => $comment,
        ] = $this->request->getArguments();

        $statusCode = (int)$statusCode;

        [$startDateTime, $endDateTime, $creationStatus] = $this->processRedirectStartAndEndDate($startDateTime, $endDateTime);

        if ($creationStatus) {
            $changedRedirects = $this->addRedirect(
                $sourceUriPath, $targetUriPath, $statusCode, $host, $comment, $startDateTime, $endDateTime
            );
            $creationStatus = is_array($changedRedirects) && count($changedRedirects) > 0;
        } else {
            $changedRedirects = [];
        }

        if (!$creationStatus) {
            $messageTitle = '';
            $message = $this->translateById('error.redirectNotCreated');
            $this->addFlashMessage('', $message, Message::SEVERITY_ERROR);
        } else {
            // Build list of changed redirects for feedback to user
            $message = $this->createChangedRedirectList($changedRedirects);

            /** @var RedirectInterface $createdRedirect */
            $createdRedirect = $changedRedirects[0];

            $messageTitle = $this->translateById(count($changedRedirects) === 1 ? 'message.redirectCreated' : 'warning.redirectCreatedWithChanges',
                [
                    $createdRedirect->getHost(),
                    $createdRedirect->getSourceUriPath(),
                    $createdRedirect->getTargetUriPath(),
                    $createdRedirect->getStatusCode()
                ]);

            $this->addFlashMessage($message, $messageTitle,
                count($changedRedirects) === 1 ? Message::SEVERITY_OK : Message::SEVERITY_WARNING);
        }

        if ($this->request->getFormat() === 'json') {
            $this->view->assign('value', [
                'success' => $creationStatus,
                'changedRedirects' => $changedRedirects,
                'messages' => $this->controllerContext->getFlashMessageContainer()->getMessagesAndFlush(),
            ]);
        } else {
            $this->redirect('index');
        }
    }

    /**
     * Updates a single redirect and goes back to the list
     *
     * @return void
     * @throws StopActionException
     */
    public function updateAction(): void
    {
        [
            'host' => $host,
            'originalHost' => $originalHost,
            'sourceUriPath' => $sourceUriPath,
            'originalSourceUriPath' => $originalSourceUriPath,
            'targetUriPath' => $targetUriPath,
            'statusCode' => $statusCode,
            'startDateTime' => $startDateTime,
            'endDateTime' => $endDateTime,
            'comment' => $comment,
        ] = $this->request->getArguments();

        $statusCode = (int)$statusCode;

        [$startDateTime, $endDateTime, $updateStatus] = $this->processRedirectStartAndEndDate($startDateTime, $endDateTime);

        if ($updateStatus) {
            $changedRedirects = $this->updateRedirect(
                $originalSourceUriPath, $originalHost, $sourceUriPath, $targetUriPath, $statusCode, $host, $comment,
                $startDateTime, $endDateTime
            );
            $updateStatus = is_array($changedRedirects) && count($changedRedirects) > 0;
        } else {
            $changedRedirects = [];
        }

        if (!$updateStatus) {
            $message = $this->translateById('error.redirectNotUpdated');
            $this->addFlashMessage('', $message, Message::SEVERITY_ERROR);
        } else {
            // Build list of changed redirects for feedback to user
            $message = $this->createChangedRedirectList($changedRedirects);

            /** @var RedirectInterface $createdRedirect */
            $createdRedirect = $changedRedirects[0];

            $messageTitle = $this->translateById(
                count($changedRedirects) === 1 ? 'message.redirectUpdated' : 'warning.redirectUpdatedWithChanges',
                [
                    $createdRedirect->getHost(),
                    $createdRedirect->getSourceUriPath(),
                    $createdRedirect->getTargetUriPath(),
                    $createdRedirect->getStatusCode()
                ]
            );

            $this->addFlashMessage($message, $messageTitle,
                count($changedRedirects) === 1 ? Message::SEVERITY_OK : Message::SEVERITY_WARNING);
        }

        if ($this->request->getFormat() === 'json') {
            $this->view->assign('value', [
                'success' => $updateStatus,
                'changedRedirects' => $changedRedirects,
                'messages' => $this->controllerContext->getFlashMessageContainer()->getMessagesAndFlush(),
            ]);
        } else {
            $this->redirect('index');
        }
    }

    /**
     * Deletes a single redirect and goes back to the list
     *
     * @return void
     * @throws StopActionException
     */
    public function deleteAction(): void
    {
        [
            'host' => $host,
            'sourceUriPath' => $sourceUriPath,
        ] = $this->request->getArguments();

        $status = $this->deleteRedirect($sourceUriPath, $host ?? null);

        if ($status === false) {
            $message = $this->translateById('error.redirectNotDeleted');
            $this->addFlashMessage('', $message, Message::SEVERITY_ERROR);
        } else {
            $message = $this->translateById('message.redirectDeleted', [$host, $sourceUriPath]);
            $this->addFlashMessage('', $message, Message::SEVERITY_OK);
        }

        if ($this->request->getFormat() === 'json') {
            $this->view->assign('value', [
                'success' => $status,
                'messages' => $this->controllerContext->getFlashMessageContainer()->getMessagesAndFlush(),
            ]);
        } else {
            $this->redirect('index');
        }
    }

    /**
     * Shows the import interface with its options, actions and a protocol after an action
     */
    public function importAction(): void
    {
        $csrfToken = $this->securityContext->getCsrfProtectionToken();
        $flashMessages = $this->controllerContext->getFlashMessageContainer()->getMessagesAndFlush();
        $this->view->assignMultiple([
            'csrfToken' => $csrfToken,
            'flashMessages' => $flashMessages,
        ]);
    }

    /**
     * Shows the export interface with its options and actions
     */
    public function exportAction(): void
    {
        $csrfToken = $this->securityContext->getCsrfProtectionToken();
        $this->view->assignMultiple([
            'csrfToken' => $csrfToken,
        ]);
    }

    /**
     * Exports all redirects into a CSV file and starts its download
     * @throws CannotInsertRecord
     */
    public function exportCsvAction(): void
    {
        $includeInactiveRedirects = $this->request->hasArgument('includeInactiveRedirects');
        $includeGeneratedRedirects = $this->request->hasArgument('includeGeneratedRedirects');

        // TODO: Make host selectable from distinct list of existing hosts
        $host = null;

        $csvWriter = $this->redirectExportService->exportCsv(
            $host,
            !$includeInactiveRedirects,
            $includeGeneratedRedirects ? null : RedirectInterface::REDIRECT_TYPE_MANUAL,
            true
        );
        $filename = 'neos-redirects-' . (new DateTime())->format('Y-m-d-H-i-s') . '.csv';

        $content = $csvWriter->getContent();
        header('Pragma: no-cache');
        header('Content-type: application/text');
        header('Content-Length: ' . strlen($content));
        header('Content-Disposition: attachment; filename=' . $filename);
        header('Content-Transfer-Encoding: binary');
        header('Cache-Control: must-revalidate, post-check=0, pre-check=0');

        echo $content;

        exit;
    }

    /**
     * Tries to import redirects from the given CSV file and then shows a protocol
     *
     * @param PersistentResource $csvFile
     * @param string $delimiter
     * @throws StopActionException
     */
    public function importCsvAction(PersistentResource $csvFile = null, string $delimiter = ','): void
    {
        $protocol = [];

        if (!$csvFile) {
            $this->addFlashMessage('', $this->translateById('error.csvFileNotSet'),
                Message::SEVERITY_ERROR);
            $this->redirect('import');
        }

        try {
            // Use temporary local copy as stream doesn't work reliably with cloud based storage
            $reader = Reader::createFromPath($csvFile->createTemporaryLocalCopy());
            $reader->setDelimiter($delimiter);

            $protocol = $this->redirectImportService->import($reader->getIterator());
            $protocolErrors = array_filter($protocol, function ($entry) {
                return $entry['type'] === RedirectImportService::REDIRECT_IMPORT_MESSAGE_TYPE_ERROR;
            });

            try {
                $this->resourceManager->deleteResource($csvFile);
            } catch (Exception $e) {
                $this->logger->warning('Could not delete csv file after importing redirects', [$e->getMessage()]);
            }

            if (count($protocol) === 0) {
                $this->addFlashMessage('', $this->translateById('error.importCsvEmpty'), Message::SEVERITY_OK);
            } elseif (count($protocolErrors) > 0) {
                $this->addFlashMessage('', $this->translateById('message.importCsvSuccessWithErrors'),
                    Message::SEVERITY_WARNING);
            } else {
                $this->addFlashMessage('', $this->translateById('message.importCsvSuccess'),
                    Message::SEVERITY_OK);
            }
        } catch (CsvException $e) {
            $this->addFlashMessage('', $this->translateById('error.importCsvFailed'),
                Message::SEVERITY_ERROR);
            $this->redirect('import');
        } catch (ResourceException $e) {
            $this->addFlashMessage('', $this->translateById('error.importResourceFailed'),
                Message::SEVERITY_ERROR);
            $this->redirect('import');
        }

        $flashMessages = $this->controllerContext->getFlashMessageContainer()->getMessagesAndFlush();
        $this->view->assignMultiple([
            'protocol' => $protocol,
            'flashMessages' => $flashMessages,
        ]);
    }

    /**
     * @param string $sourceUriPath
     * @param string $targetUriPath
     * @param integer $statusCode
     * @param string|null $host
     * @param string|null $comment
     * @param DateTime|null $startDateTime
     * @param DateTime|null $endDateTime
     * @param bool $force
     * @return array
     */
    protected function addRedirect(
        string $sourceUriPath,
        string $targetUriPath,
        int $statusCode,
        ?string $host = null,
        ?string $comment = null,
        DateTime $startDateTime = null,
        DateTime $endDateTime = null,
        bool $force = false
    ): array {
        $sourceUriPath = trim($sourceUriPath);
        $targetUriPath = trim($targetUriPath);

        if (!$this->validateRedirectAttributes($host, $sourceUriPath, $targetUriPath)) {
            return [];
        }

        $redirect = $this->redirectStorage->getOneBySourceUriPathAndHost($sourceUriPath, $host ? $host : null, false);
        $isSame = $this->isSame($sourceUriPath, $targetUriPath, $host, $statusCode, $redirect);
        $go = true;

        if ($redirect !== null && $isSame === false && $force === false) {
            $go = false; // Ignore.. A redirect with the same source URI exist.
        } elseif ($redirect !== null && $isSame === false && $force === true) {
            $this->redirectStorage->removeOneBySourceUriPathAndHost($sourceUriPath, $host);
            $this->persistenceManager->persistAll();
        } elseif ($redirect !== null && $isSame === true) {
            $go = false; // Ignore.. Not valid.
        }

        if ($go) {
            $creator = $this->securityContext->getAccount()->getAccountIdentifier();

            $redirects = $this->redirectStorage->addRedirect($sourceUriPath, $targetUriPath, $statusCode, [$host],
                $creator,
                $comment, RedirectInterface::REDIRECT_TYPE_MANUAL, $startDateTime, $endDateTime);

            $this->persistenceManager->persistAll();
            return $redirects;
        }

        return [];
    }

    /**
     * @param string $originalSourceUriPath
     * @param string|null $originalHost
     * @param string $sourceUriPath
     * @param string|null $targetUriPath
     * @param integer $statusCode
     * @param string|null $host
     * @param string|null $comment
     * @param DateTime|null $startDateTime
     * @param DateTime|null $endDateTime
     * @param bool $force
     * @return array
     */
    protected function updateRedirect(
        string $originalSourceUriPath,
        ?string $originalHost,
        string $sourceUriPath,
        string $targetUriPath,
        int $statusCode,
        ?string $host = null,
        ?string $comment = null,
        DateTime $startDateTime = null,
        DateTime $endDateTime = null,
        bool $force = false
    ): array {
        $sourceUriPath = trim($sourceUriPath);
        $targetUriPath = trim($targetUriPath);

        if (!$this->validateRedirectAttributes($host, $sourceUriPath, $targetUriPath)) {
            $this->addFlashMessage('', $this->translateById('error.redirectNotValid'), Message::SEVERITY_ERROR);
            return [];
        }

        // Check for existing redirect with the same properties before changing the edited redirect
        if ($originalSourceUriPath !== $sourceUriPath || $originalHost !== $host) {
            $existingRedirect = $this->redirectStorage->getOneBySourceUriPathAndHost($sourceUriPath,
                $host ?: null, false);
            if ($existingRedirect !== null) {
                $this->addFlashMessage('', 'error.redirectExists', Message::SEVERITY_ERROR);
                return [];
            }
        }

        $go = false;
        $redirect = $this->redirectStorage->getOneBySourceUriPathAndHost($originalSourceUriPath,
            $originalHost ?: null, false);

        if ($redirect !== null && $force === false) {
            $this->deleteRedirect($originalSourceUriPath, $originalHost);
            $go = true;
        } elseif ($force === true) {
            $go = true;
        }

        if ($go) {
            return $this->addRedirect($sourceUriPath, $targetUriPath, $statusCode, $host, $comment, $startDateTime,
                $endDateTime, $force);
        }

        return [];
    }

    /**
     * @param string $sourceUriPath
     * @param string|null $host
     * @return bool
     */
    protected function deleteRedirect(string $sourceUriPath, ?string $host = null): bool
    {
        $redirect = $this->redirectStorage->getOneBySourceUriPathAndHost($sourceUriPath, $host ? $host : null);
        if ($redirect === null) {
            return false;
        }
        $this->redirectStorage->removeOneBySourceUriPathAndHost($sourceUriPath, $host);
        $this->persistenceManager->persistAll();

        return true;
    }

    /**
     * @param string|null $host
     * @param string $sourceUriPath
     * @param string $targetUriPath
     * @return bool
     */
    protected function validateRedirectAttributes(?string $host, string $sourceUriPath, string $targetUriPath): bool
    {
        if ($sourceUriPath === $targetUriPath) {
            $this->addFlashMessage('', $this->translateById('error.sameSourceAndTarget'),
                Message::SEVERITY_WARNING);
        } elseif (!preg_match($this->validationOptions['sourceUriPath'], $sourceUriPath)) {
            $this->addFlashMessage('',
                $this->translateById('error.sourceUriPathNotValid', [$this->validationOptions['sourceUriPath']]),
                Message::SEVERITY_WARNING);
        } else {
            return true;
        }
        return false;
    }

    /**
     * @param string $sourceUriPath
     * @param string $targetUriPath
     * @param string|null $host
     * @param int $statusCode
     * @param RedirectInterface|null $redirect
     * @return bool
     */
    protected function isSame(
        string $sourceUriPath,
        string $targetUriPath,
        ?string $host,
        int $statusCode,
        RedirectInterface $redirect = null
    ): bool {
        if ($redirect === null) {
            return false;
        }

        return $redirect->getSourceUriPath() === $sourceUriPath
            && $redirect->getTargetUriPath() === $targetUriPath
            && $redirect->getHost() === $host
            && $redirect->getStatusCode() === (integer)$statusCode;
    }

    /**
     * Shorthand to translate labels for this package
     *
     * @param string|null $id
     * @param array $arguments
     * @return string
     */
    protected function translateById(string $id, array $arguments = []): ?string
    {
        try {
            return $this->translator->translateById($id, $arguments, null, null, 'Modules',
                'Neos.RedirectHandler.Ui');
        } catch (\Exception $e) {
            return $id;
        }
    }

    /**
     * Creates a html list of changed redirects
     *
     * @param array<RedirectInterface> $changedRedirects
     * @return string
     */
    protected function createChangedRedirectList(array $changedRedirects): string
    {
        $list = array_reduce($changedRedirects, function ($carry, RedirectInterface $redirect) {
            return $carry . '<li>' . $redirect->getHost() . '/' . $redirect->getSourceUriPath() . ' &rarr; /' . $redirect->getTargetUriPath() . '</li>';
        }, '');
        $list = $list ? '<p>' . $this->translateById('message.relatedChanges') . '</p><ul>' . $list . '</ul>' : '';
        return $list;
    }
}
