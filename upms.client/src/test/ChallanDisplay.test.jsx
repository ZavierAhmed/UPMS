import {render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {challanDisplayNumber,documentReference,sourceChallanDisplayNumber,reportReference,reportParticulars} from '../../management/src/challanDisplay.js';
import {ReturnForm,ReturnDetail} from '../../management/src/ChallanReturn.jsx';
const custom={id:'3',kind:'CHALLAN',status:'POSTED',official_number:'DC-0003',payload:{customChallanNumber:' ch-001 ',reference:'OTHER'}};
it('uses only the normalized explicit challan number without mutating the document',()=>{
 const before=JSON.stringify(custom);expect(challanDisplayNumber(custom)).toBe('CH-001');expect(documentReference(custom)).toBe('CH-001');expect(JSON.stringify(custom)).toBe(before);
});
it('falls back to generated identity or draft label without using supplier or payment references',()=>{
 expect(challanDisplayNumber({...custom,payload:{reference:'OTHER'}})).toBe('DC-0003');
 expect(challanDisplayNumber({...custom,status:'DRAFT',official_number:null,payload:{reference:'OTHER'}})).toBe('Draft 3');
 expect(challanDisplayNumber({...custom,kind:'VENDOR_PAYMENT',official_number:'VP-0003'})).toBe('VP-0003');
});
it('resolves return display from the immutable source ID and keeps raw references intact',()=>{
 const d={payload:{originalId:'3',originalReference:'DC-0003'},originalDisplayNumber:'CH-001'};
 expect(sourceChallanDisplayNumber(d,[custom])).toBe('CH-001');expect(sourceChallanDisplayNumber(d)).toBe('CH-001');expect(d.payload.originalReference).toBe('DC-0003');
 expect(reportReference({reference:'DC-0003',displayReference:'CH-001'})).toBe('CH-001');expect(reportParticulars({particulars:'Return DC-0003',displayParticulars:'Return CH-001'})).toBe('Return CH-001');
});
it('return form shows the customer-facing source while posting only the original immutable ID',()=>{
 render(<ReturnForm source={{...custom,party_id:'1',date:'2026-11-01',returnableLines:[]}} command={vi.fn()}/>);
 expect(screen.getByText(/Original challan: CH-001/)).toBeTruthy();expect(screen.queryByText(/DC-0003/)).toBeNull();
});
it('return acknowledgment shows the source display number, preserving its own return identity',()=>{
 const d={id:'5',status:'POSTED',date:'2026-11-01',official_number:'DCR-0005',originalDisplayNumber:'CH-001',payload:{originalId:'3',originalReference:'DC-0003'},lines:[]};
 render(<ReturnDetail detail={d} Table={()=>null} SummaryCards={()=>null}/>);
 expect(screen.getByText(/Original challan: CH-001/)).toBeTruthy();expect(screen.queryByText(/DC-0003/)).toBeNull();expect(screen.getByRole('heading',{name:'DCR-0005'})).toBeTruthy();
});
