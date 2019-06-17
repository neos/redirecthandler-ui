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

        $statusCodes = $this->settings['statusCodes'];
        array_walk($statusCodes, function (&$label, $code) {
            if ($label === 'i18n') {
                $label = $this->translator->translateById('statusCodes.' . $code . '.label',
                    [], null, null, 'Modules', 'Neos.RedirectHandler.Ui');
            }
        });

        $this->view->assignMultiple([
            'redirects' => $redirects,
            'flashMessages' => $this->flashMessageContainer->getMessagesAndFlush(),
        ]);
    }

    /**
     * @Flow\SkipCsrfProtection
     * @throws NoSuchArgumentException
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
            $this->addFlashMessage('Redirect not created', '', Error\Message::SEVERITY_ERROR);
        } else {
            $this->addFlashMessage('Redirect created', '', Error\Message::SEVERITY_OK);
        }

        $this->redirect('index');
    }

    /**
     * @throws InvalidArgumentNameException
     * @throws InvalidArgumentTypeException
     * @throws NoSuchArgumentException
     * @throws StopActionException
     */
    public function updateAction()
    {
        if ($this->request->getArguments() && $this->request->hasArgument('updateAction')) {
            $removeArguments = explode(',', $this->request->getArgument('updateAction'));
            $status = $this->updateRedirect(
                $removeArguments[0],
                $removeArguments[1] ? $removeArguments[1] : null,
                $this->request->getArgument('updateData')['source'],
                $this->request->getArgument('updateData')['target'],
                $this->request->getArgument('updateData')['code'],
                $this->request->getArgument('updateData')['host']
            );

            if ($status === false) {
                $this->addFlashMessage('Redirect not updated', '', Error\Message::SEVERITY_ERROR);
            } else {
                $this->addFlashMessage('Redirect updated', '', Error\Message::SEVERITY_OK);

                $this->request->setArgument('source', $this->request->getArgument('updateData')['source']);
                $this->request->setArgument('target', '');
                $this->request->setArgument('code', '');
                $this->request->setArgument('host', '');
            }
        }
        $this->redirect('index');
    }

    /**
     * @throws NoSuchArgumentException
     * @throws StopActionException
     */
    public function removeAction()
    {
        if ($this->request->hasArgument('remove')) {
            $removeArguments = explode(',', $this->request->getArgument('remove'));
            $status = $this->removeRedirect(
                $removeArguments[0],
                $removeArguments[1] ? $removeArguments[1] : null
            );

            if ($status === false) {
                $this->addFlashMessage('Redirect not removed', '', Error\Message::SEVERITY_ERROR);
            } else {
                $this->addFlashMessage('Redirect removed', '', Error\Message::SEVERITY_OK);
            }
        }
        $this->redirect('index');
    }

    /**
     * @param string $sourceUriPath
     * @param string $targetUriPath
     * @param string $statusCode
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
        $redirect = $this->redirectStorage->getOneBySourceUriPathAndHost($sourceUriPath, $host, false);
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
            // TODO: Use full name instead of account identifier
            $creator = $this->securityContext->getAccount()->getAccountIdentifier();

            $this->redirectStorage->addRedirect($sourceUriPath, $targetUriPath, $statusCode, [$host], $creator,
                $comment, RedirectInterface::REDIRECT_TYPE_MANUAL, $startDateTime, $endDateTime);
            $this->persistenceManager->persistAll();
            return true;
        }

        return false;
    }

    /**
     * @param string $source
     * @param string $host
     * @param string $newSource
     * @param string $newTarget
     * @param string $newStatusCode
     * @param string|null $newHost
     * @param bool $force
     * @return bool
     */
    protected function updateRedirect(
        $source,
        $host,
        $newSource,
        $newTarget,
        $newStatusCode,
        $newHost = null,
        $force = false
    ) {
        $go = false;
        $redirect = $this->redirectStorage->getOneBySourceUriPathAndHost($source, $host, false);
        if ($redirect !== null && $force === false) {
            $this->removeRedirect($source, $host);

            $go = true;
        } elseif ($force === true) {
            $go = true;
        }

        if ($go) {
            $this->addRedirect($newSource, $newTarget, $newStatusCode, $newHost, $force);

            return true;
        }

        return false;
    }

    /**
     * @param string $source
     * @param string|null $host
     * @return bool
     */
    protected function removeRedirect($source, $host = null)
    {
        $redirect = $this->redirectStorage->getOneBySourceUriPathAndHost($source, $host);
        if ($redirect === null) {
            return false;
        }
        $this->redirectStorage->removeOneBySourceUriPathAndHost($source, $host);
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
}
