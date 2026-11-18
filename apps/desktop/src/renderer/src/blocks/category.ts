import * as Blockly from 'blockly/core';
import {
  Box,
  Calculator,
  CircuitBoard,
  Clock,
  GitBranch,
  Lightbulb,
  Radar,
  Repeat,
  Search,
  Sigma,
  Terminal,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const ICONS: Record<string, LucideIcon> = {
  outputs: Lightbulb,
  sensors: Radar,
  time: Clock,
  logic: GitBranch,
  loops: Repeat,
  math: Calculator,
  text: Type,
  serial: Terminal,
  pins: CircuitBoard,
  variables: Box,
  functions: Sigma,
  results: Search,
};

const svgCache = new Map<string, string>();

function iconMarkup(id: string): string {
  let markup = svgCache.get(id);
  if (markup === undefined) {
    const Icon = ICONS[id];
    markup = Icon
      ? renderToStaticMarkup(createElement(Icon, { size: 16, color: '#fff', 'aria-hidden': true }))
      : '';
    svgCache.set(id, markup);
  }
  return markup;
}

/**
 * Toolbox category drawn as an icon on a coloured square, which is easier to
 * recognize than Blockly's default coloured stripe.
 */
class IconCategory extends Blockly.ToolboxCategory {
  protected override createIconDom_(): Element {
    const icon = document.createElement('span');
    icon.className = 'category-icon';
    icon.style.background = this.colour_;
    icon.innerHTML = iconMarkup(this.getId());
    return icon;
  }

  protected override addColourBorder_(): void {
    // The coloured icon already identifies the category.
  }
}

let registered = false;

export function registerIconCategory(): void {
  if (registered) return;
  Blockly.registry.register(
    Blockly.registry.Type.TOOLBOX_ITEM,
    Blockly.ToolboxCategory.registrationName,
    IconCategory,
    true,
  );
  registered = true;
}
