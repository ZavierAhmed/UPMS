<?php
declare(strict_types=1);

namespace App\Upms;

final class ProductionRelease
{
    public static function verify(array $profile): void
    {
        $root=dirname(__DIR__,4);
        $path=$root.'/RELEASE.json';
        if (!is_file($path) || is_link($path)
            || hash_file('sha256',$path)!==($profile['releaseManifestSha256']??'')) {
            throw new \RuntimeException('CUMULATIVE_RELEASE_MANIFEST_REJECTED');
        }
        $manifest=json_decode(file_get_contents($path),true,64,JSON_THROW_ON_ERROR);
        if (($manifest['sourceCommit']??'')!==($profile['releaseSha']??'') || !is_array($manifest['files']??null)) {
            throw new \RuntimeException('CUMULATIVE_RELEASE_SOURCE_REJECTED');
        }
        foreach ($manifest['files'] as $relative=>$digest) {
            $file=realpath($root.'/'.$relative);
            if (!$file || is_link($root.'/'.$relative) || !str_starts_with($file,$root.DIRECTORY_SEPARATOR)
                || !is_file($file) || !hash_equals($digest,hash_file('sha256',$file))) {
                throw new \RuntimeException('CUMULATIVE_RELEASE_FILE_REJECTED');
            }
        }
    }
}
