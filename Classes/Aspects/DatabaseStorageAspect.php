<?php

namespace Neos\RedirectHandler\Ui\Aspects;

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
