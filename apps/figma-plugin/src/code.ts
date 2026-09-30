// Plugin main thread: the only code that touches the Figma document.
// The UI does network calls and planning; this file reads snapshots and applies plans.
import { apply, contrast, snapshot } from './figma-ops';
import type { PullPlan } from './sync';
figma.showUI(__html__, { width: 420, height: 620, themeColors: true });

type Msg =
  | { type: 'init' }
  | { type: 'save-settings'; settings: Record<string, string> }
  | { type: 'snapshot'; systemId: string; systemName: string }
  | { type: 'apply'; systemId: string; plan: PullPlan }
  | { type: 'contrast' }
  | { type: 'resize'; height: number };

figma.ui.onmessage = async (msg: Msg) => {
  try {
    if (msg.type === 'init') {
      const settings = (await figma.clientStorage.getAsync('settings')) ?? {};
      figma.ui.postMessage({ type: 'init', settings, fileName: figma.root.name });
    } else if (msg.type === 'save-settings') {
      await figma.clientStorage.setAsync('settings', msg.settings);
    } else if (msg.type === 'snapshot') {
      figma.ui.postMessage({ type: 'snapshot', snapshot: await snapshot(msg.systemId, msg.systemName) });
    } else if (msg.type === 'apply') {
      const result = await apply(msg.systemId, msg.plan);
      figma.ui.postMessage({ type: 'applied', ...result });
      figma.notify(`Applied ${result.done} changes from the vault.`);
    } else if (msg.type === 'contrast') {
      figma.ui.postMessage({ type: 'contrast', results: await contrast() });
    } else if (msg.type === 'resize') {
      figma.ui.resize(420, Math.max(360, Math.min(900, msg.height)));
    }
  } catch (err) {
    figma.ui.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};

figma.on('selectionchange', () => figma.ui.postMessage({ type: 'selection', count: figma.currentPage.selection.length }));

