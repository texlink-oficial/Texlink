import React from 'react';
import { Navigate } from 'react-router-dom';

const SupplierProfilePage: React.FC = () => {
    return <Navigate to="/portal/configuracoes?tab=profile" replace />;
};

export default SupplierProfilePage;
