<?php

declare(strict_types=1);

// Private supervised delivery worker. Never route this script through a web server.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/../vendor/autoload.php';

use App\Upms\InquiryDelivery;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

$transport = null;
$outcome = 'Unknown';
$phase = 'connect';
try {
    $p = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
    $s = $p['smtp'];
    $transport = new class ($s['host'], (int) $s['port'], $s['tls'] === 'SslOnConnect') extends EsmtpTransport {
        public function __destruct()
        {
            // This one-shot worker closes the socket without a second QUIT.
            // Parent destruction would issue QUIT after the stream is terminated.
            $this->getStream()->terminate();
        }

        public function start(): void
        {
            parent::start();
            if (! array_key_exists('AUTH', $this->getCapabilities())) {
                throw new TransportException('Authenticated SMTP required');
            }
        }
    };
    $transport->setRequireTls(true)->setUsername($s['username'])->setPassword($s['password']);
    $ssl = ['verify_peer' => true, 'verify_peer_name' => true, 'allow_self_signed' => false, 'crypto_method' => STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT];
    if ($s['cafile']) {
        $ssl['cafile'] = $s['cafile'];
    }
    $transport->getStream()->setTimeout(max(0.1, $p['timeout'] / 1000))->setStreamOptions(['ssl' => $ssl]);
    $transport->start();
    $phase = 'send';
    $email = (new Email())->from(new Address($s['from'], 'Unique Plastic Industry'))->to(new Address($s['recipient'], 'Unique Plastic Industry inquiries'))->replyTo($p['input']['email'])->subject('Unique Plastic Industry packaging inquiry ['.$p['reference'].']')->text(InquiryDelivery::body($p['input'], $p['reference']));
    $transport->send($email);
    $outcome = 'SmtpAccepted';
} catch (Throwable $e) {
    $code = (int) $e->getCode();
    $outcome = $code >= 400 && $code <= 599 ? 'Rejected' : ($phase === 'connect' && ! str_contains(strtolower($e->getMessage()), 'timed out') ? 'Unavailable' : 'Unknown');
}
// Emit before QUIT: loss of the connection after final DATA acceptance cannot undo it.
echo $outcome;
if ($transport) {
    $transport->getStream()->terminate();
}
