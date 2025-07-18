import React from 'react';

interface Match {
  id: string;
  timestamp: string;
  result: string;
  decks: string[];
}

interface MatchHistoryListProps {
  matches: Match[];
}

export default function MatchHistoryList({ matches }: MatchHistoryListProps): JSX.Element {
  return (
    <ul className="space-y-2 mt-4">
      {matches.map(match => (
        <li key={match.id} className="flex justify-between p-3 bg-background-card dark:bg-dark-background-card shadow rounded">
          <div>
            <p className="font-medium">{new Date(match.timestamp).toLocaleString()}</p>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">결과: {match.result}</p>
          </div>
          <div className="flex space-x-1">
            {match.decks.map(deck => (
              <span key={deck} className="bg-background-base dark:bg-dark-background-base px-2 py-1 rounded text-xs">{deck}</span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
