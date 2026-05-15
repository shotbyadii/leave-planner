import React from 'react';

const Sidebar = ({ leaves }) => {
  return (
    <aside className="glass-panel sidebar">
      <div className="logo">
        <div className="logo-icon">✈️</div>
        LeaveSync
      </div>
      
      <div className="leave-balances">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          Leave Balance
        </h2>
        
        <div className="glass-card balance-card pl">
          <div className="balance-info">
            <h3>Privileged (PL)</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Back-to-back allowed</span>
          </div>
          <div className="balance-count text-gradient">{leaves.pl.total - leaves.pl.used}</div>
        </div>
        
        <div className="glass-card balance-card el">
          <div className="balance-info">
            <h3>Emergency (EL)</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Max 2 w/o cert</span>
          </div>
          <div className="balance-count" style={{ color: 'var(--status-el)' }}>{leaves.el.total - leaves.el.used}</div>
        </div>
        
        <div className="glass-card balance-card rh">
          <div className="balance-info">
            <h3>Restricted (RH)</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Any valid day</span>
          </div>
          <div className="balance-count" style={{ color: 'var(--status-rh)' }}>{leaves.rh.total - leaves.rh.used}</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
