import tokens from '../theme/tokens';

export default function Tabs({ activeTab, onSelect, tabs }) {
  return (
    <div className="flex space-x-2 border-b" style={{ borderColor: tokens.line }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`px-4 py-2 text-sm font-medium focus:outline-none transition-all duration-200 ${
            activeTab === tab.id ? 'border-b-2 font-semibold' : 'hover:bg-white hover:bg-opacity-5'
          }`}
          style={{
            color: activeTab === tab.id ? tokens.text : tokens.muted,
            borderColor: activeTab === tab.id ? tokens.text : 'transparent',
          }}
        >
          {tab.name}
        </button>
      ))}
    </div>
  );
}
