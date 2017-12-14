<?php

namespace WebExcess\RedirectHandler\Backend\Aspects;

use Neos\Flow\Annotations as Flow;
use Neos\Flow\Persistence\QueryInterface;
use Neos\Flow\Persistence\QueryResultInterface;

trait DatabaseStorageTrait
{

    /**
     * @param string $sourceUriPath
     * @param string $targetUriPath
     * @param string $statusCode
     * @return QueryResultInterface
     */
    public function search($sourceUriPath = null, $targetUriPath = null, $statusCode = null)
    {

        $searchParameters = [];
        if ($sourceUriPath) {
            $searchParameters['sourceUriPath'] = '%' . trim($sourceUriPath, '/') . '%';
        }
        if ($targetUriPath) {
            $searchParameters['targetUriPath'] = '%' . trim($targetUriPath, '/') . '%';
        }
        if ($statusCode) {
            $searchParameters['statusCode'] = $statusCode . '%';
        }

        if (!$searchParameters) {
            return $this->findAll();
        }

        $searchSqlProperties = array_map(function ($name) {
            return sprintf('r.%s LIKE :%s', $name, $name);
        }, array_keys($searchParameters));

        $sql = 'SELECT r FROM Neos\RedirectHandler\DatabaseStorage\Domain\Model\Redirect r WHERE ';
        $sql .= implode(' AND ', $searchSqlProperties);
        $sql .= ' AND (r.host = :host OR r.host IS NULL)';

        /** @var QueryInterface $query */
        $query = $this->entityManager->createQuery($sql);
        $query->setParameters($searchParameters);
        $query->setParameter('host', null);

        return $query->execute();
    }

}
