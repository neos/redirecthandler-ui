<?php

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
use Neos\Error\Messages\Message;
use Neos\Flow\Annotations as Flow;
use Neos\Flow\I18n\Translator;
use Neos\Flow\Mvc\Exception\InvalidArgumentNameException;
use Neos\Flow\Mvc\Exception\InvalidArgumentTypeException;
use Neos\Flow\Mvc\Exception\NoSuchArgumentException;
use Neos\Flow\Mvc\Exception\StopActionException;
use Neos\Flow\Mvc\View\ViewInterface;
use Neos\Fusion\View\FusionView;
use Neos\Neos\Controller\Module\AbstractModuleController;
use Neos\Flow\Persistence\PersistenceManagerInterface;
use Neos\Flow\Security\Context as SecurityContext;
use Neos\Error\Messages as Error;

use Neos\RedirectHandler\RedirectInterface;
use Neos\RedirectHandler\Storage\RedirectStorageInterface;
use Neos\RedirectHandler\DatabaseStorage\Domain\Repository\RedirectRepository;

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
     * @var RedirectRepository
     */
    protected $redirectRepository;

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
     * Renders the list of all redirects and allows modifying them.
     */
    public function indexAction()
    {
        $redirects = $this->redirectRepository->search();
        $csrfToken = $this->securityContext->getCsrfProtectionToken();
        $flashMessages = $this->flashMessageContainer->getMessagesAndFlush();

        $this->view->assignMultiple([
            'redirects' => $redirects,
            'flashMessages' => $flashMessages,
            'csrfToken' => $csrfToken,
        ]);
    }

    /**
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

        // TODO: Catch redirects without sourceUri or when source and target are the same

        // TODO: Convert strings to actual date time objects
        if (empty($startDateTime)) {
            $startDateTime = null;
        }
        if (empty($endDateTime)) {
            $endDateTime = null;
        }

        $status = $this->addRedirect(
            $sourceUriPath, $targetUriPath, $statusCode, $host, $comment, $startDateTime, $endDateTime
        );

        if ($status === false) {
            $this->addFlashMessage('', $this->translateById('message.redirectNotCreated'),
                Error\Message::SEVERITY_ERROR);
        } else {
            $this->addFlashMessage('', $this->translateById('message.redirectCreated'),
                Error\Message::SEVERITY_OK);
        }

        $this->redirect('index');
    }

    /**
     * @throws StopActionException
     */
    public function updateAction()
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

        // TODO: Catch redirects without sourceUri or when source and target are the same

        // TODO: Convert strings to actual date time objects
        if (empty($startDateTime)) {
            $startDateTime = null;
        }
        if (empty($endDateTime)) {
            $endDateTime = null;
        }

        $status = $this->updateRedirect(
            $originalSourceUriPath, $originalHost, $sourceUriPath, $targetUriPath, $statusCode, $host, $comment,
            $startDateTime, $endDateTime
        );

        if ($status === false) {
            $this->addFlashMessage('', $this->translateById('message.redirectNotUpdated'),
                Error\Message::SEVERITY_ERROR);
        } else {
            $this->addFlashMessage('', $this->translateById('message.redirectUpdated'),
                Error\Message::SEVERITY_OK);
        }

        $this->redirect('index');
    }

    /**
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
            $this->addFlashMessage('', $this->translateById('message.redirectNotDeleted'),
                Error\Message::SEVERITY_ERROR);
        } else {
            $this->addFlashMessage('', $this->translateById('message.redirectDeleted'), Error\Message::SEVERITY_OK);
        }

        $this->redirect('index');
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
     * @return bool
     */
    protected function addRedirect(
        $sourceUriPath,
        $targetUriPath,
        $statusCode,
        $host = null,
        $comment = null,
        DateTime $startDateTime = null,
        DateTime $endDateTime = null,
        $force = false
    ): bool {
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

            $this->redirectStorage->addRedirect($sourceUriPath, $targetUriPath, $statusCode, [$host], $creator,
                $comment, RedirectInterface::REDIRECT_TYPE_MANUAL, $startDateTime, $endDateTime);
            $this->persistenceManager->persistAll();
            return true;
        }

        return false;
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
     * @return bool
     */
    protected function updateRedirect(
        $originalSourceUriPath,
        $originalHost,
        $sourceUriPath,
        $targetUriPath,
        $statusCode,
        $host = null,
        $comment = null,
        DateTime $startDateTime = null,
        DateTime $endDateTime = null,
        $force = false
    ) {
        // TODO: Actually update redirect instead of deleting and creating it?
        $go = false;
        $redirect = $this->redirectStorage->getOneBySourceUriPathAndHost($originalSourceUriPath, $originalHost ? $originalHost : null, false);
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

        return false;
    }

    /**
     * @param string $sourceUriPath
     * @param string|null $host
     * @return bool
     */
    protected function deleteRedirect($sourceUriPath, $host = null)
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
     * @param string $sourceUriPath
     * @param string $targetUriPath
     * @param string $host
     * @param string $statusCode
     * @param RedirectInterface|null $redirect
     * @return bool
     */
    protected function isSame($sourceUriPath, $targetUriPath, $host, $statusCode, RedirectInterface $redirect = null)
    {
        if ($redirect === null) {
            return false;
        }

        return $redirect->getSourceUriPath() === $sourceUriPath
            && $redirect->getTargetUriPath() === $targetUriPath
            && $redirect->getHost() === $host
            && $redirect->getStatusCode() === (integer)$statusCode;
    }

    /**
     * Sets the Fusion path pattern on the view.
     *
     * @param ViewInterface $view
     * @return void
     */
    protected function initializeView(ViewInterface $view)
    {
        parent::initializeView($view);

        /** @var FusionView $view */
        $view->disableFallbackView();
        $view->setFusionPathPatterns(['resource://@package/Private/FusionModule']);
        $view->setFusionPathPattern('resource://@package/Private/FusionModule');
    }

    /**
     * Shorthand to translate labels for this package
     *
     * @param $id
     * @return string
     */
    protected function translateById($id): string
    {
        return $this->translator->translateById($id, [], null, null, 'Modules',
            'Neos.RedirectHandler.Ui');
    }
}
