<?php
namespace Neos\RedirectHandler\Ui\ViewHelpers;

use Neos\Flow\Annotations as Flow;
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
