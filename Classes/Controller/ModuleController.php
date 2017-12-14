<?php

namespace WebExcess\RedirectHandler\Backend\Controller;

use Neos\Flow\Annotations as Flow;
use Neos\Error\Messages\Message;
use Neos\Neos\Controller\Module\AbstractModuleController;
use Neos\Flow\Persistence\PersistenceManagerInterface;
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

    public function indexAction()
    {
        $host = null;

        if ($this->request->getArguments() && $this->request->hasArgument('updateAction')) {
            $removeArguments = explode(',', $this->request->getArgument('updateAction'));
            $status = $this->updateRedirect(
                $removeArguments[0],
                $removeArguments[1] ? $removeArguments[1] : null,
                $this->request->getArgument('updateData')['source'],
                $this->request->getArgument('updateData')['target'],
                $this->request->getArgument('updateData')['code'],
                $host
            );

            if ($status === false) {
                $this->addFlashMessage('Redirect not updated', '', Error\Message::SEVERITY_ERROR);
            } else {
                $this->addFlashMessage('Redirect updated', '', Error\Message::SEVERITY_OK);

//                set new search values..
                $this->request->setArgument('source', $this->request->getArgument('updateData')['source']);
                $this->request->setArgument('target', '');
                $this->request->setArgument('code', '');
            }
        }

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

        if ($this->request->hasArgument('action') && $this->request->getArgument('action') == 'create') {
            $status = $this->addRedirect(
                $this->request->getArgument('source'),
                $this->request->getArgument('target'),
                $this->request->getArgument('code'),
                $host
            );

            if ($status === false) {
                $this->addFlashMessage('Redirect not created', '', Error\Message::SEVERITY_ERROR);
            } else {
                $this->addFlashMessage('Redirect created', '', Error\Message::SEVERITY_OK);
            }
        }

        if ($this->request->getArguments()) {
            $redirects = $this->redirectRepository->search(
                $this->request->getArgument('source'),
                $this->request->getArgument('target'),
                $this->request->getArgument('code')
            );
        } else {
            $redirects = $this->redirectStorage->getAll($host);
        }

        $this->view->assign('arguments', $this->request->getArguments());
        $this->view->assign('redirects', $redirects);
    }

    /**
     * @param string $source
     * @param string $target
     * @param string $statusCode
     * @param string|null $host
     * @param bool $force
     * @return array|bool
     */
    protected function addRedirect($source, $target, $statusCode, $host = null, $force = false)
    {
        $redirect = $this->redirectStorage->getOneBySourceUriPathAndHost($source, $host, false);
        $isSame = $this->isSame($source, $target, $host, $statusCode, $redirect);
        $go = true;
        if ($redirect !== null && $isSame === false && $force === false) {
            $go = false; // Ignore.. A redirect with the same source URI exist.
        } elseif ($redirect !== null && $isSame === false && $force === true) {
            $this->redirectStorage->removeOneBySourceUriPathAndHost($source, $host);
            $this->persistenceManager->persistAll();
        } elseif ($redirect !== null && $isSame === true) {
            $go = false; // Ignore.. Not valid.
        }

        if ($go) {
            $redirects = $this->redirectStorage->addRedirect($source, $target, $statusCode, [$host]);
            $this->persistenceManager->persistAll();

            return $redirects;
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
    protected function updateRedirect( $source, $host, $newSource, $newTarget, $newStatusCode, $newHost = null, $force = false) {
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

        return $redirect->getSourceUriPath() === $sourceUriPath && $redirect->getTargetUriPath() === $targetUriPath && $redirect->getHost() === $host && $redirect->getStatusCode() === (integer)$statusCode;
    }
}
