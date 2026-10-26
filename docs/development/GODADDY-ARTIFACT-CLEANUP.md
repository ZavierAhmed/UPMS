# GoDaddy generated-artifact cleanup

Completed first on 2026-10-26, before source changes. All paths below are relative to the UPMS repository. The exact inventory was displayed before deletion. Native literal-path deletion was restricted to validated files inside artifacts/; no source, Git history, original databases, backups, uploaded assets or external files were deleted.

35 files deleted: 16 ZIPs, 12 SHA256 files, six receipts and one generated package-metadata JSON. Each deletion was verified with Test-Path; all remain absent after tests. These were ignored local files, so Git alone cannot establish deletion. The SHA256 column records each file before deletion.

| Deleted path | SHA256 before deletion |
| --- | --- |
| artifacts/godaddy-preview-receipt.json | de365ed0aa5d484cadf99122a7afd4dfcf9424fb9879988bd9888902c43d824e |
| artifacts/rollback/godaddy-managed/f167ad4ac3f624cd242b488897a9d531d2cf5d93/0bb3caebb6244e8d/upms-godaddy-node22-preview.zip | 0bb3caebb6244e8d9f013db926eab115d2289387e8354b60cb5e659f71dea3c1 |
| artifacts/rollback/godaddy-managed/fc1fe660bd97c5daa95ea5399e9285ca6c1d19c6/84a913e2df4bfb61/upms-godaddy-node22-preview.zip | 84a913e2df4bfb616e18a849a9748808af5ad26f1ec99f37fa3c77607cfb22e6 |
| artifacts/rollback/w072/604c78afc1c16f9ce8df26299201f8bb08b4d192/upms-fullstack-node.zip | 23300612a53455e496cd5cabc8eeb76bb6658c34d750b0e9c3b0460d56a31334 |
| artifacts/rollback/w072/604c78afc1c16f9ce8df26299201f8bb08b4d192/upms-fullstack-node.zip.sha256 | e06d60747c6e01b70034a7fb1bdf340ca5fe1da07865b8972acff1bce3e8816f |
| artifacts/rollback/w072/604c78afc1c16f9ce8df26299201f8bb08b4d192/upms-public-website.zip | 3ec43bf200f2b635ed4116296ab7bcf355d4fba610a5863fff38a591c40b5b82 |
| artifacts/rollback/w072/604c78afc1c16f9ce8df26299201f8bb08b4d192/upms-public-website.zip.sha256 | 76f212c114a14e36ecbaa98a0a5703209df815b989cf2c4d2d8f8bc98fe12389 |
| artifacts/rollback/w072/f619bbc1ad7065941d7c578b790a529746b704b5/upms-fullstack-node.zip | 0cb0aff0dde06d3a8492c6882fa1c8e6796f9f7280037345db991178df3d94ff |
| artifacts/rollback/w072/f619bbc1ad7065941d7c578b790a529746b704b5/upms-fullstack-node.zip.sha256 | eee0bc727eae06629f1c55c76bebd5415e37f54f789d5e0f75590fca8852db52 |
| artifacts/rollback/w072/f619bbc1ad7065941d7c578b790a529746b704b5/upms-public-website.zip | b8be0e6f7c7b828195d237c404d1ba248dfcd4feb32c8ee8f8e55576574268b8 |
| artifacts/rollback/w072/f619bbc1ad7065941d7c578b790a529746b704b5/upms-public-website.zip.sha256 | dcfb710d45c3967f426799a7e3c9a0c6a21cff131381fbaccc6c18ced9460a29 |
| artifacts/rollback/w072/preexisting-23300612a53455e4/upms-node-deployment.zip | 23300612a53455e496cd5cabc8eeb76bb6658c34d750b0e9c3b0460d56a31334 |
| artifacts/rollback/w072/preexisting-71116c8f47b605b4/upms-node-deployment.zip | 71116c8f47b605b47b7464d468fc6d008152ca4f74016daaa39cc93ee7bb2cf5 |
| artifacts/upms-fullstack-node.zip | 0cb0aff0dde06d3a8492c6882fa1c8e6796f9f7280037345db991178df3d94ff |
| artifacts/upms-fullstack-node.zip.sha256 | eee0bc727eae06629f1c55c76bebd5415e37f54f789d5e0f75590fca8852db52 |
| artifacts/upms-godaddy-controlled-diagnostic-node22.zip | ac02365389b61b5a7246b4aebee5489b83976fad2636555504eef597cfe393b4 |
| artifacts/upms-godaddy-controlled-diagnostic-node22.zip.sha256 | 5982aeb6d18e7b2c5178cbacd1dc33cae1b00906b87559902622d86b85740d9f |
| artifacts/upms-godaddy-controlled-diagnostic-receipt.json | 8e5d81789ed83ce74e80ed3fc7fd0a38a94b66d815552cfc1ca24a703191664f |
| artifacts/upms-godaddy-cpanel-node22.zip | 0a5940ea3850e12225521722bc10d4df88b63eef0f0c19682805c7176a7f4e09 |
| artifacts/upms-godaddy-cpanel-node22.zip.sha256 | 4ca853e759c2f6bf06b9b4f61b8caf314af2f0e7435c7d28dcc05d2442c12fa0 |
| artifacts/upms-godaddy-cpanel-release-receipt.json | e69ebec2eb853d918268f5ede108d90be3ffc33de782fc07188db994f329ddd8 |
| artifacts/upms-godaddy-db-diagnostic-node22.zip | 389b69157395826ddc1c64d7738808dae57eb25cdda8f76d06f1faf478327063 |
| artifacts/upms-godaddy-db-diagnostic-node22.zip.sha256 | 12510fe817ee0a898e66b9d13e0c7af666d44f2a071ec4e6528587922189af53 |
| artifacts/upms-godaddy-db-diagnostic-receipt.json | f426ebcd45e63350290300483550ea2f1620d2567e1352a801285111b37ce869 |
| artifacts/upms-godaddy-management-compliance-receipt.json | b6bcbf694ff985e97f5c0218fe011317a17f2351b7935d82d39f8084e7bc86a1 |
| artifacts/upms-godaddy-management-compliant-node22.zip | 903623fc21150e5cdd25667f68ae2c8a7fd95cfd8ebdd4a9fd5c2679ae04a958 |
| artifacts/upms-godaddy-management-compliant-node22.zip.sha256 | 01a979cf29e4333ec2d7fadc6b69e517ea2a149999530bd052b2499da81c9c1d |
| artifacts/upms-godaddy-management-package.json | 13feb3836d9c2457adf7595ec3af88e4d0afd78f9596fcebe3818182cc58fe67 |
| artifacts/upms-godaddy-node22-preview.zip | 0bb3caebb6244e8d9f013db926eab115d2289387e8354b60cb5e659f71dea3c1 |
| artifacts/upms-godaddy-node22-preview.zip.sha256 | 5c5033948848f9e16bdcefa659b37a05aa3b791eacc52d4274cfdc2c47ba685f |
| artifacts/upms-node-deployment.zip | 0a5940ea3850e12225521722bc10d4df88b63eef0f0c19682805c7176a7f4e09 |
| artifacts/upms-node-deployment.zip.sha256 | 9ccd6a2bfcb71b0464b7d7f9aaa10913cb8458fdfe5bd19e654c92b72b182a6d |
| artifacts/upms-public-website.zip | b8be0e6f7c7b828195d237c404d1ba248dfcd4feb32c8ee8f8e55576574268b8 |
| artifacts/upms-public-website.zip.sha256 | dcfb710d45c3967f426799a7e3c9a0c6a21cff131381fbaccc6c18ced9460a29 |
| artifacts/W07-2-release-receipt.json | 1e0eb99c07a3dd2e43b69bff1f3da5b778ac9df69995d7f1842a531f2436ed09 |

Generic-named W07.2 public/fullstack archives and rollback copies were confirmed outputs of scripts/package-godaddy.mjs. The root upms-node-deployment.zip contained the GoDaddy blocked-preview package identity. The ZIPs were inspected for database/backups before deletion. Matching generated receipts/checksums were removed.

The following nine generic application archives were preserved and rechecked hash-identical. Every other preserved artifacts/ file was also rechecked against the pre-cleanup hash inventory.

- artifacts/rollback/production-readiness/f619bbc1ad7065941d7c578b790a529746b704b5/upms-management-node22.zip — a41e7de89a023f7491d7478d4c2b4a427a99259c94b073f41c387ab87d73181d
- artifacts/rollback/production-readiness/f619bbc1ad7065941d7c578b790a529746b704b5/upms-management-node24.zip — d2aa67cab5fd57cfe80521bd038b8540c5f439259f1a377ffbe45a00347163de
- artifacts/rollback/production-readiness/faad5c5e110336ac58d59815e27fe3ba35cd4fa9/upms-management-node22.zip — ddb133af8c9b9aa9af9c755dd88299597713bdb413029535f7aeacfa9385939b
- artifacts/rollback/production-readiness/faad5c5e110336ac58d59815e27fe3ba35cd4fa9/upms-management-node24.zip — 995ca4dd5733c16f3dc51061dc3f37b118bf56fdaa9d69007a2a55c26eb87456
- artifacts/rollback/production-readiness/fc1fe660bd97c5daa95ea5399e9285ca6c1d19c6/upms-management-node22.zip — ea83f276594f93edeab3545005f70d9324741288f0a71f5f791033077b82a982
- artifacts/rollback/production-readiness/fc1fe660bd97c5daa95ea5399e9285ca6c1d19c6/upms-management-node24.zip — 604588ea11b4b42d9894bbb0de4260d110fd1075e55b499ad85a9a7dc0453b37
- artifacts/upms-management-node22 (2).zip — 86d71858909de63e5772b50372d0a9381831416dda08d5ba678016b150461d46
- artifacts/upms-management-node22.zip — ea83f276594f93edeab3545005f70d9324741288f0a71f5f791033077b82a982
- artifacts/upms-management-node24.zip — 604588ea11b4b42d9894bbb0de4260d110fd1075e55b499ad85a9a7dc0453b37

No new hosting ZIP was generated. The official MariaDB vendor runtime downloaded into ignored tmp/ for isolated tests is a test dependency, not a generated publishing artifact. No deployment, publish or live database write occurred. User-supplied untracked branding/product assets were preserved and excluded from this commit. Public site source was unchanged.
