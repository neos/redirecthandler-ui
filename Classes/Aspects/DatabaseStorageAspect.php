<?php

namespace WebExcess\RedirectHandler\Backend\Aspects;

use Neos\Flow\Annotations as Flow;
use Neos\Flow\Persistence\QueryInterface;
use Neos\Utility\ObjectAccess;

/**
 * @Flow\Introduce("class(Neos\RedirectHandler\DatabaseStorage\Domain\Repository\RedirectRepository)", traitName="WebExcess\RedirectHandler\Backend\Aspects\DatabaseStorageTrait")
 * @Flow\Aspect
 */
class DatabaseStorageAspect
{
}
