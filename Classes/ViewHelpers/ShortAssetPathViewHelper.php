<?php
namespace WebExcess\RedirectHandler\Backend\ViewHelpers;

use Neos\Flow\Annotations as Flow;
use Neos\FluidAdaptor\Core\ViewHelper\AbstractViewHelper;

class ShortAssetPathViewHelper extends AbstractViewHelper
{
    /**
     * @param string $assetPath
     * @return string
     */
    public function render($assetPath = null)
    {
        $exploded = explode('/', $assetPath);
        if (count($exploded) > 3) {
            return $exploded[0] . (strlen($exploded[0]) < 6 ? '/' . $exploded[1] : '') . '/.../' . $exploded[count($exploded)-1];
        } else {
            return $assetPath;
        }
    }
}
