import "./PastPrintsLog.css";

const TAG_CONFIG = {
    completed: { label: "Completed", color: "var(--status-online)" },
    issue: { label: "Issue", color: "var(--status-idle)" },
    error: { label: "Error", color: "var(--status-error)"},
};

export default function PastPrintsLog({ entries, onSelectEntry}) {
    return (
        <div className="history-status">
            <p className="device-card__label">Past Prints:</p>
            <div className="prints-log">
                <ul className="prints-log__list">
                    {entries.map((entry) => {
                        const tag = TAG_CONFIG[entry.tag];

                        return (
                            <li key={entry.id}>
                                <button type="button" className="prints-log__item" onClick={() => onSelectEntry(entry)}>
                                    <span className="prints-log__item-main">
                                        <span className="prints-log__item-name">{entry.projectName}</span>
                                        <span className="prints-log__item-date">{entry.date}</span>
                                    </span>
                                    <span className="prints-log__tag" style={{ background: tag.color, borderColor: tag.color }}>
                                        {tag.label}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}