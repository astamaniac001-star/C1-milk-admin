import { BLUE } from "../lib/constants.js";

const TABS = [
  { id: "dashboard", icon: "🏠", label: "Home" },
  { id: "customers", icon: "👥", label: "Customers" },
  { id: "delivery", icon: "🚚", label: "Delivery" },
  { id: "imports", icon: "🥛", label: "Imports" },
  { id: "billing", icon: "🧾", label: "Billing" },
  { id: "more", icon: "☰", label: "More" },
];

const TAB_TITLES = {
  dashboard: "Dashboard",
  customers: "Customers",
  delivery: "Daily Delivery",
  imports: "Milk Imports",
  billing: "Billing",
  more: "More",
};

function getTabLabelStyle(isActive) {
  return {
    fontSize: 10,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? BLUE : "#9ca3af",
  };
}

function getActiveIndicatorStyle() {
  return {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2,
    background: BLUE,
    borderRadius: 2,
  };
}

function TabButton({ tab, active, onSelect }) {
  const isActive = tab === active;
  return (
    <button
      key={tab.id}
      onClick={() => onSelect(tab.id)}
      style={{
        flex: 1,
        padding: "9px 2px 7px",
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        position: "relative",
      }}
    >
      <span style={{ fontSize: 17 }}>{tab.icon}</span>
      <span style={getTabLabelStyle(isActive)}>{tab.label}</span>
      {isActive && <span style={getActiveIndicatorStyle()} />}
    </button>
  );
}

export function AppShell({ tab, today, onTabChange, onLogout, children, footer }) {
  return (
    <div
      style={{
        fontFamily: "system-ui,sans-serif",
        maxWidth: 420,
        margin: "0 auto",
        background: "#f8fafc",
        minHeight: 640,
        position: "relative",
        paddingBottom: 68,
      }}
    >
      <div
        style={{
          background: BLUE,
          color: "#fff",
          padding: "14px 16px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 200,
        }}
      >
        <div>
          <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: 0.8 }}>
            MILK DELIVERY ADMIN V17
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 1 }}>
            {TAB_TITLES[tab]}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, opacity: 0.85 }}>
          <div>{today}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              justifyContent: "flex-end",
              marginTop: 2,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: "#4ade80",
                borderRadius: "50%",
                display: "inline-block",
              }}
            />
            Online
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign out"
              style={{
                marginTop: 6,
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                border: "0.5px solid rgba(255,255,255,0.35)",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: 0.3,
              }}
            >
              SIGN OUT
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "14px 12px" }}>{children}</div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderTop: "0.5px solid #e5e7eb",
          display: "flex",
          zIndex: 300,
        }}
      >
        {TABS.map((t) => (
          <TabButton key={t.id} tab={t} active={tab} onSelect={onTabChange} />
        ))}
      </div>

      {footer}
    </div>
  );
}
