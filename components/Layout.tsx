import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { subscribeToPush } from '../lib/pushManager';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    useEffect(() => {
        // Tentar inscrever para push ao carregar o app
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            subscribeToPush();
        }
    }, []);

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            {/* md:ml-64 creates space for the sidebar on desktop */}
            <div className="md:ml-64 min-h-screen transition-all duration-300">
                {children}
            </div>

            {/* Mobile Bottom Navigation */}
            {/* Hidden on md (768px) and up */}
            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
};

export default Layout;
