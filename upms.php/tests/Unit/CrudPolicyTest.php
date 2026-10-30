<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\{RuntimePrivileges,BusinessRecords,CrudGuards};
use PHPUnit\Framework\TestCase;

final class CrudPolicyTest extends TestCase
{
    public function test_exact_crud_and_strict_policies_are_independent(): void
    {
        $rows = RuntimePrivileges::expected(RuntimePrivileges::GODADDY, 'upms_v1');
        $account = 'upms_runtime84@localhost';
        $this->assertTrue(RuntimePrivileges::compare(RuntimePrivileges::GODADDY, 'upms_v1', $account, $account, $rows)['passed']);
        $this->assertFalse(RuntimePrivileges::compare(RuntimePrivileges::STRICT, 'upms_v1', $account, $account, $rows)['passed']);
        $strict = RuntimePrivileges::expected(RuntimePrivileges::STRICT, 'upms_v1');
        $this->assertCount(53, $strict);
        $this->assertTrue(RuntimePrivileges::compare(RuntimePrivileges::STRICT, 'upms_v1', $account, $account, $strict)['passed']);
        foreach ($rows as $key => $row) {
            $bad = $rows;
            unset($bad[$key]);
            $this->assertFalse(RuntimePrivileges::compare(RuntimePrivileges::GODADDY, 'upms_v1', $account, $account, $bad)['passed']);
        }
        foreach (['USER||||SUPER','SCHEMA|upms_v1|||SELECT','SCHEMA|other|||SELECT','SCHEMA|upms\\_v1|||TRIGGER','TABLE|upms_v1|users||SELECT','COLUMN|upms_v1|users|enabled|UPDATE','SCHEMA|upms\\_v1|||SELECT|GRANTABLE'] as $extra) {
            $this->assertFalse(RuntimePrivileges::compare(RuntimePrivileges::GODADDY, 'upms_v1', $account, $account, [...$rows,$extra])['passed']);
        }
        $this->assertFalse(RuntimePrivileges::compare(RuntimePrivileges::GODADDY, 'upms_v1', $account, 'other@localhost', $rows)['passed']);
        $this->assertFalse(RuntimePrivileges::compare(RuntimePrivileges::GODADDY, 'upms_v1', $account, $account, $rows, false)['passed']);
        $this->assertFalse(RuntimePrivileges::compare(RuntimePrivileges::GODADDY, 'upms_v1', $account, $account, [...$rows,$rows[0]])['passed']);
    }
    public function test_unknown_policy_cannot_fall_back_to_crud(): void
    {
        $this->expectExceptionMessage('PRIVILEGE_POLICY_REJECTED');
        RuntimePrivileges::expected('relaxed', 'upms_v1');
    }
    public function test_business_repository_denies_protected_mutations(): void
    {
        foreach ([['v1_stock_journal',['delta'],'update'],['v1_party_journal',['credit'],'update'],['v1_audit',['reason'],'update'],['v1_commands',['result'],'update'],['v1_control',['state'],'update'],['v1_items',['code'],'update'],['v1_documents',['actor_id'],'update'],['users',['password_hash'],'update'],['upms_production_migrations',['state'],'insert'],['v1_items',['id'],'insert'],['v1_items',['description'],'delete']] as [$table,$cols,$verb]) {
            try {
                BusinessRecords::permit($table, $cols, $verb);
                $this->fail('Protected mutation allowed');
            } catch (\LogicException $e) {
                $this->assertSame('Protected business mutation', $e->getMessage());
            }
        }
        BusinessRecords::permit('v1_stock', ['quantity'], 'update');
        BusinessRecords::permit('v1_documents', ['status','payload'], 'update');
        BusinessRecords::permit('v1_audit', ['actor_id','reason'], 'insert');
        $this->addToAssertionCount(3);
    }
    public function test_guard_plan_never_relies_on_runtime_session_variables(): void
    {
        $plan = CrudGuards::plan();
        $this->assertCount(45, $plan);
        foreach ($plan as $r) {
            $this->assertStringContainsString("SUBSTRING_INDEX(USER(),'@',1) = 'upms_runtime84'", $r['body']);
            $this->assertStringContainsString("SIGNAL SQLSTATE '45000'",$r['body']);
            $this->assertStringNotContainsString('@upms',$r['body']);
        }
        $this->assertStringContainsString("OLD.status <> 'DRAFT'",$plan['upms85_v1_documents_update']['body']);
    }
}
