import {useState} from 'react';
function text(row){return Object.values(row).filter(v=>typeof v==='string'||typeof v==='number').join(' ').toLowerCase();}
export function useBusinessList(records){const [query,setQuery]=useState('');return {query,setQuery,records:query?records.filter(r=>text(r).includes(query.trim().toLowerCase())):records};}
