<?php
namespace Neos\RedirectHandler\Ui\Fusion\Helper;

/*
 * This file is part of the Neos.RedirectHandler.Ui package.
 *
 * (c) Contributors of the Neos Project - www.neos.io
 *
 * This package is Open Source Software. For the full copyright and license
 * information, please view the LICENSE file which was distributed with this
 * source code.
 */

use Neos\Eel\ProtectedContextAwareInterface;
use Neos\RedirectHandler\RedirectInterface;

class RedirectHelper implements ProtectedContextAwareInterface
{
    /**
     * @param string $path
     * @return string
     */
    public function shortenPath($path = ''): string
    {
        $exploded = explode('/', $path);
        if (count($exploded) > 3) {
            return $exploded[0] . (strlen($exploded[0]) < 6 ? '/' . $exploded[1] : '') . '/.../' . $exploded[count($exploded) - 1];
        } else {
            return $path;
        }
    }

    /**
     * @param RedirectInterface $redirect
     * @return string
     */
    public function createIdentifier(RedirectInterface $redirect): string
    {
        return $redirect->getSourceUriPath() . $redirect->getHost();
    }

    /**
     * All methods are considered safe
     *
     * @param string $methodName
     * @return boolean
     */
    public function allowsCallOfMethod($methodName): bool
    {
        return true;
    }
}
