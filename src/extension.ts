import * as vscode from 'vscode';

import { extractTextFromLexical } from './utils/extractTextFromLexical'
import { createJournalEntry, fetchJournalEntries } from './api/journalApi';
import type { JournalEntry } from './types'

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('journal.newEntry', async () => {
    const entry = await vscode.window.showInputBox({
      prompt: 'What did you work on today?',
      placeHolder: 'E.g. Fixed a bug, learned something new, hit a blocker...'
    });

    if (!entry) return;

    // TODO: support mood scores
    // const mood = await vscode.window.showQuickPick([
    //   '😞', '😐', '🙂', '😀', '🤩'
    // ], {
    //   placeHolder: 'How was your day?'
    // });

    // if (!mood) return;

    const token = await context.secrets.get('journalToken');
    if (!token) {
      vscode.window.showErrorMessage('You need to set your journal token first. Run "Jots: Set Token".');
      return;
    }

    const success = await createJournalEntry(entry, token);
    if (success) {
      vscode.window.showInformationMessage('Journal entry saved! 🎉');
      updateStatusBar();
    } else {
      vscode.window.showErrorMessage('Failed to save journal entry.');
    }
  });

  const setTokenCmd = vscode.commands.registerCommand('journal.setToken', async () => {
    const token = await vscode.window.showInputBox({
      prompt: 'Paste your personal token (you can generate a new token from within your Jots app and paste it here)',
      ignoreFocusOut: true,
      password: true
    });
    if (token) {
      await context.secrets.store('journalToken', token);
      vscode.window.showInformationMessage('Token saved successfully!');
    }
  });

  const showSidebarCmd = vscode.commands.registerCommand('journal.showSidebar', async () => {
    const token = await context.secrets.get('journalToken');
    if (!token) {
      vscode.window.showErrorMessage('You need to set your journal token first. Run "Jots: Set Token".');
      return;
    }

    const entries = await fetchJournalEntries(token);
    const panel = vscode.window.createWebviewPanel(
      'journalSidebar',
      'Journal Entries',
      vscode.ViewColumn.Two,
      {
        enableScripts: true
      }
    );

    panel.webview.html = getWebviewContent(entries);
  });

  context.subscriptions.push(disposable, setTokenCmd, showSidebarCmd);

  // Status bar item
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBar.command = 'journal.newEntry';
  statusBar.tooltip = 'Click to write your developer journal entry';
  context.subscriptions.push(statusBar);

  async function updateStatusBar() {
    const token = await context.secrets.get('journalToken');
    if (!token) return;
    const entries = await fetchJournalEntries(token);
    // const streak = calculateStreak(entries);
    statusBar.text = `$(book) My Developer Journal`;
    statusBar.show();
  }

  updateStatusBar();

  // Daily reminder using configurable setting
  const config = vscode.workspace.getConfiguration('journal');
  const reminderHour = config.get<number>('reminderHour', 17);
  const reminderMinute = config.get<number>('reminderMinute', 0);
  let lastReminderDate: string | null = null;

  const interval = setInterval(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (now.getHours() === reminderHour && now.getMinutes() === reminderMinute && lastReminderDate !== today) {
      vscode.window.showInformationMessage("Don't forget to write your journal entry today ✍️");
      lastReminderDate = today;
    }
  }, 60 * 1000);

  context.subscriptions.push({ dispose: () => clearInterval(interval) });
}

// TODO: support streaks
// function calculateStreak(entries: JournalEntry[]): number {
//   const dates = new Set(entries.map(e => new Date(e.date).toISOString().split('T')[0]));
//   let streak = 0;
//   let current = new Date();

//   while (true) {
//     const iso = current.toISOString().split('T')[0];
//     if (dates.has(iso)) {
//       streak++;
//       current.setDate(current.getDate() - 1);
//     } else {
//       break;
//     }
//   }
//   return streak;
// }

function getWebviewContent(entries: JournalEntry[]): string {
  const items = entries
    .filter(entry => extractTextFromLexical(entry.content).trim() !== '')
    .map(entry => `<li><strong>${new Date(entry.date).toLocaleDateString()}:</strong> ${extractTextFromLexical(entry.content)}</li>`)
    .join('\n');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body {
          font-family: sans-serif;
          padding: 1em;
        }
        h2 {
          color: #007acc;
        }
        ul {
          padding-left: 1.2em;
        }
        li {
          margin-bottom: 0.5em;
        }
      </style>
      <title>Journal Entries</title>
    </head>
    <body>
      <h2>Past Journal Entries</h2>
      <ul>
        ${items || '<li>No entries found.</li>'}
      </ul>
    </body>
    </html>
  `;
}


export function deactivate() {}
