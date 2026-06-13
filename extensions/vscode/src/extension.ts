import * as vscode from 'vscode';
import { scanFile } from './scanCommand';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('shiftscope.scanFile', () => scanFile(context)),
    vscode.commands.registerCommand('shiftscope.scanWorkspace', () => scanFile(context, true)),
  );
}

export function deactivate() {}
