<?php

namespace Neos\RedirectHandler\Ui\Aspects;

/*
 * This file is part of the Neos.RedirectHandler.Ui package.
 *
 * (c) Contributors of the Neos Project - www.neos.io
 *
 * This package is Open Source Software. For the full copyright and license
 * information, please view the LICENSE file which was distributed with this
 * source code.
 */

use Neos\Flow\Annotations as Flow;
use Neos\Flow\Persistence\QueryInterface;
use Neos\Utility\ObjectAccess;

/**
 * @Flow\Introduce("class(Neos\RedirectHandler\DatabaseStorage\Domain\Repository\RedirectRepository)", traitName="Neos\RedirectHandler\Ui\Aspects\DatabaseStorageTrait")
 * @Flow\Aspect
 */
class DatabaseStorageAspect
{
}
