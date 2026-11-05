import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './components/Shell';
import Intake from './screens/Intake';
import CaseFile from './screens/CaseFile';
import Interview from './screens/Interview';
import Decision from './screens/Decision';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/intake" element={<Shell screen="intake"><Intake /></Shell>} />
        <Route path="/file" element={<Shell screen="file"><CaseFile /></Shell>} />
        <Route path="/interview" element={<Shell screen="interview"><Interview /></Shell>} />
        <Route path="/decision" element={<Shell screen="decision"><Decision /></Shell>} />
        <Route path="*" element={<Navigate to="/intake" replace />} />
      </Routes>
    </>
  );
}
