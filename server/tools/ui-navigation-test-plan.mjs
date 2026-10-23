// New credential identities; only unused schemas already accepted by the unchanged
// synthetic database-name gates. No main/demo targets and no previous schema reuse.
export const uiNavigationTestPlan=Object.freeze({
 full01:{schema:'upms_test_p27c_sales_20261023_02',run:'navf01',scope:'expenses',suffix:'x'},
 full02:{schema:'upms_test_p27c_sales_20261023_03',run:'navf02',scope:'expenses',suffix:'x'},
 full03:{schema:'upms_test_p27c_sales_20261023_04',run:'navf03',scope:'expenses',suffix:'x'},
 regression02:{schema:'upms_test_p27c_regression_20261023_06',run:'navr02',scope:'regression',suffix:'r'},
 regression:{schema:'upms_test_p27c_regression_20261023_05',run:'navr01',scope:'regression',suffix:'r'},
 inventory:{schema:'upms_test_p27c_inventory_20261023_06',run:'navi01',scope:'inventory',suffix:'i'},
 purchasing:{schema:'upms_test_p27c_purchasing_20261023_06',run:'navp01',scope:'purchasing',suffix:'p'},
 classification:{schema:'upms_test_p27c_classification_20261023_05',run:'navc01',scope:'classification',suffix:'c'}
});
export function navigationTestTarget(key){const p=uiNavigationTestPlan[key];if(!p)throw Error('Unknown reviewed UI test target');return {...p,user:'upms_runtime_test_p27c'+p.suffix+p.run,migrator:'upms_migrator_test_uinav_'+key};}
