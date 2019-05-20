<?php
namespace Neos\RedirectHandler\Ui\ViewHelpers;

/*
 * This file is part of the Neos.RedirectHandler.Ui package.
 *
 * (c) Contributors of the Neos Project - www.neos.io
 *
 * This package is Open Source Software. For the full copyright and license
 * information, please view the LICENSE file which was distributed with this
 * source code.
 */

use Neos\FluidAdaptor\Core\ViewHelper\AbstractViewHelper;

class ShortPathViewHelper extends AbstractViewHelper
{
    /**
     * @param string $path
     * @return string
     */
    public function render($path = null)
    {
        $exploded = explode('/', $path);
        if (count($exploded) > 3) {
            return $exploded[0] . (strlen($exploded[0]) < 6 ? '/' . $exploded[1] : '') . '/.../' . $exploded[count($exploded)-1];
        } else {
            return $path;
        }
    }
}
