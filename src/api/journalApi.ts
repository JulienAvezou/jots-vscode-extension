import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { decodeJwt } from 'jose';

import { wrapTextInLexical } from '../utils/wrapTextInLexical';
import type { JournalEntry } from '../types';

const API_BASE_URL = 'https://www.daily-jots.com/api/';

export async function createJournalEntry(content: string, token: string): Promise<boolean> {
  try {
    const payload = decodeJwt(token);

    const userId = payload.sub;

    const formattedContent = wrapTextInLexical(content)

    const date = new Date();
    const formattedDate = date.toISOString().split('T')[0];

    const response = await fetch(`${API_BASE_URL}journal_entry`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ content: formattedContent, user_id: userId, date: formattedDate })
    });

    if (!response.ok) {
      const msg = await response.text();
      vscode.window.showErrorMessage(`Error creating entry: ${msg}`);
      return false;
    }

    return true;
  } catch (error: any) {
    vscode.window.showErrorMessage(`Network error: ${error.message}`);
    return false;
  }
}

export async function fetchJournalEntries(token: string): Promise<JournalEntry[]> {
  try {
    const response = await fetch(`${API_BASE_URL}journal_entries/week_entries`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (!response.ok) {
      const msg = await response.text();
      vscode.window.showErrorMessage(`Error fetching entries: ${msg}`);
      return [];
    }

    const data = await response.json();
    return data as JournalEntry[];
  } catch (error: any) {
    vscode.window.showErrorMessage(`Network error: ${error.message}`);
    return [];
  }
}
