/**
 * @typedef Box
 * @property {number} x
 * @property {number} y
 * @property {string} id
 * @property {string} content
 */

function App() {

  const boxDefaultContent = 'Hello,\nYou can drag me with the handle.\nOr double-click on empty area to generate more.';
  const boxConfig = {
    w: 250, h: 150
  };
  const rootEl = document.getElementById('app');
  const wireContainerEl = document.getElementById('wire-container');
  const saveStateBtnEl = document.getElementById('btn-save-state');

  let boxNextId = 0;

  function WireManager(renderRoot) {
    let wires = [];
    let svgRoot = renderRoot;
    let wireRequest = {};

    function render() {
      wires.forEach((wire) => {
        let elem = wire.getElement();
        if (!svgRoot.contains(elem)) {
          svgRoot.appendChild(elem);
        }
      });
    }

    this.requestWireStart = (meta) => {
      if (meta && meta.id && meta.x && meta.y) {
        Object.defineProperty(wireRequest, 'start', {
          value: meta,
          writable: true
        });
      }
    }

    this.requestWireEnd = (meta) => {
      if (meta && meta.id && meta.x && meta.y) {
        Object.defineProperty(wireRequest, 'end', {
          value: meta,
          writable: true
        });
        if (wireRequest.start.id !== wireRequest.end.id) {
          wires.push(new Wire(wireRequest.start, wireRequest.end));
          render();
        }
      }
    }

    this.requestWireUpdate = (meta) => {
      if (meta && meta.id && meta.dx && meta.dy) {
        wires.forEach((wire) => {
          wire.update(meta.id, meta.dx, meta.dy);
        });
      }
    }

    this.requestWireClean = (id) => {
      let newWires = wires.filter((wire) => {
        if (wire.has(id)) {
          wire.delete();
          wire = void 0;
        } else {
          return true;
        }
      });
      wires = newWires;
    }
  }

  const wireManager = new WireManager(wireContainerEl);

  function BoxManager(renderRoot) {
    let boxes = [];
    let domRoot = renderRoot;

    function render() {
      boxes.forEach((box) => {
        let elem = box.getElement();
        if (!domRoot.contains(elem)) {
          domRoot.appendChild(elem);
        }
      });
    }

    this.addBox = (box) => {
      boxes.push(box);
      render();
    }

    this.pointOnBox = (x, y) => {
      for (let i = 0; i < boxes.length; ++i) {
        if (boxes[i].contain(x, y)) return true;
      }
      return false;
    }

    this.requestBoxDelete = (id) => {
      let newBoxes = boxes.filter((box) => {
        if (box.is(id)) {
          box = void 0;
        } else {
          return true;
        }
      });
      boxes = newBoxes;
      wireManager.requestWireClean(id);
    }

    this.getBoxes = () => {
      return boxes;
    }
  }

  const boxManager = new BoxManager(rootEl);

  /**
   * Box instance.
   * @param {Box} data - The data represents a box.
   * @param {object} config - The configuration for the box.
   */
  function Box(data, config) {
    let w = config.w || 250;
    let h = config.h || 150;
    let handleSize = config.handleSize || 40;
    let funcArea = config.funcArea || 20;
    let id = data.id;
    let x = data.x + handleSize / 2;
    let y = data.y - handleSize / 2;
    let content = data.content;
    let dragImm = {
      dx: 0, dy: 0
    };
    let dragHandleRef;
    let lastMouseDownTarget;
    let dom = createBox(x, y);

    function boxEventHandler(e) {
      let cursorX = e.clientX;
      let cursorY = e.clientY;
      let eTarget = e.target;
      switch (e.type) {
        case 'dragstart':
          console.log('[Box::boxEventHandler]', id, lastMouseDownTarget)
          if (onDragHandle(lastMouseDownTarget)) {
            dom.style.opacity = '0.3';
            dragImm.dx = cursorX - x;
            dragImm.dy = cursorY - y;
          } else {
            e.preventDefault();
          }
          break;
        case 'dragend':
          newX = cursorX - dragImm.dx;
          newY = cursorY - dragImm.dy;
          dx = newX - x;
          dy = newY - y;
          dom.style.opacity = '1.0';
          dom.style.left = newX + 'px';
          dom.style.top = newY + 'px';
          x = newX;
          y = newY;
          wireManager.requestWireUpdate({ id, dx, dy });
          break;
        case 'mousemove':
          if (dragHandleRef && onDragHandle(eTarget)) {
            break;
          }
          if (onFuncArea(cursorX, cursorY)) {
            dom.style.borderColor = '#c00';
          } else {
            dom.style.borderColor = '#eacbab';
          }
          if (onDeleteArea(cursorX, cursorY)) {
            dom.style.backgroundColor = '#c00';
          } else {
            dom.style.backgroundColor = '#fff3e1';
          }
          break;
        case 'mouseleave':
          dom.style.borderColor = '#eacbab';
          dom.style.backgroundColor = '#fff3e1';
          break;
        case 'mousedown':
          if (onDeleteArea(cursorX, cursorY)) {
            dom.remove();
            boxManager.requestBoxDelete(id);
          } else if (onFuncArea(cursorX, cursorY)) {
            wireManager.requestWireStart({ id, x: x + w / 2, y: y + h / 2 });
          }
          lastMouseDownTarget = eTarget;
          break;
        case 'mouseup':
          if (onFuncArea(cursorX, cursorY)) {
            wireManager.requestWireEnd({ id, x: x + w / 2, y: y + h / 2 });
          }
          break;
        default:
          console.error(`[Box::boxEventHandler] Unhandled event type: ${e.type}`);
      }
    }

    /**
     * Check if a point is in "function zone".
     * @param {number} cursorX 
     * @param {number} cursorY 
     */
    function onFuncArea(cursorX, cursorY, zoneWidth = funcArea) {
      if ((cursorX > x && cursorX < x + zoneWidth)
        || (cursorX < x + w && cursorX > x + w - zoneWidth)
        || (cursorY > y && cursorY < y + zoneWidth)
        || (cursorY < y + h && cursorY > y + h - zoneWidth)) {
        return true;
      } else {
        return false;
      }
    }

    /**
     * Check if a point is in "delete zone".
     * @param {number} cursorX 
     * @param {number} cursorY 
     */
    function onDeleteArea(cursorX, cursorY, zoneWidth = funcArea) {
      if (cursorX > x + w - zoneWidth && cursorX < x + w
        && cursorY > y && cursorY < y + zoneWidth) {
        return true;
      } else {
        return false;
      }
    }

    /**
     * Check if a point is in "drag handle".
     * @param {object} target - Event target element.
     */
    function onDragHandle(target) {
      if (target === dragHandleRef || dragHandleRef.contains(target)) {
        return true;
      } else {
        return false;
      }
    }

    function textEventHandler(e) {
      let target = e.target;
      switch (e.type) {
        case 'input':
          content = target.value;
          break;
        default:
          console.error(`[Box::textEventHandler] Unhandled event type: ${e.type}`);
      }
    }

    /**
     * Create a box at (x, y).
     * @param {number} _x 
     * @param {number} _y 
     */
    function createBox(_x, _y) {
      let box = document.createElement('div');
      let textarea = document.createElement('textarea');
      let handle = document.createElement('div');
      dragHandleRef = handle;
      box.id = id;
      box.classList.add('box');
      box.setAttribute('draggable', 'true');
      box.style.left = _x + 'px';
      box.style.top = _y + 'px';
      box.appendChild(handle);
      box.appendChild(textarea);
      box.addEventListener('dragstart', boxEventHandler);
      box.addEventListener('dragend', boxEventHandler);
      box.addEventListener('mousemove', boxEventHandler);
      box.addEventListener('mouseleave', boxEventHandler);
      box.addEventListener('mousedown', boxEventHandler);
      box.addEventListener('mouseup', boxEventHandler);
      textarea.value = content;
      textarea.addEventListener('input', textEventHandler);
      handle.classList.add('handle');
      handle.innerHTML = '<svg viewBox="0 0 10 10" style="display: block; fill: inherit; flex-shrink: 0; backface-visibility: hidden;"><path d="M3,2 C2.44771525,2 2,1.55228475 2,1 C2,0.44771525 2.44771525,0 3,0 C3.55228475,0 4,0.44771525 4,1 C4,1.55228475 3.55228475,2 3,2 Z M3,6 C2.44771525,6 2,5.55228475 2,5 C2,4.44771525 2.44771525,4 3,4 C3.55228475,4 4,4.44771525 4,5 C4,5.55228475 3.55228475,6 3,6 Z M3,10 C2.44771525,10 2,9.55228475 2,9 C2,8.44771525 2.44771525,8 3,8 C3.55228475,8 4,8.44771525 4,9 C4,9.55228475 3.55228475,10 3,10 Z M7,2 C6.44771525,2 6,1.55228475 6,1 C6,0.44771525 6.44771525,0 7,0 C7.55228475,0 8,0.44771525 8,1 C8,1.55228475 7.55228475,2 7,2 Z M7,6 C6.44771525,6 6,5.55228475 6,5 C6,4.44771525 6.44771525,4 7,4 C7.55228475,4 8,4.44771525 8,5 C8,5.55228475 7.55228475,6 7,6 Z M7,10 C6.44771525,10 6,9.55228475 6,9 C6,8.44771525 6.44771525,8 7,8 C7.55228475,8 8,8.44771525 8,9 C8,9.55228475 7.55228475,10 7,10 Z"></path></svg>'
      return box;
    }

    this.getElement = () => {
      return dom;
    }

    this.contain = (px, py) => {
      if (px > x && px < x + w && py > y && py < y + h) return true;
      else return false;
    }

    this.is = (_id) => {
      if (_id === id) return true;
      else return false;
    }

    this.toJSON = () => {
      return { x, y, id, content };
    }
  }

  /**
   * Represent a wire.
   * @param {object} _start
   * @param {object} _end 
   */
  function Wire(_start, _end) {

    let start = _start;
    let end = _end;
    let dom = createWire();

    function makeSVG(tag, attrs) {
      var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (var k in attrs)
        el.setAttribute(k, attrs[k]);
      return el;
    }

    function createWire() {
      let tag = 'line';
      let attrs = {
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        stroke: '#8e633f',
        'stroke-width': 2
      };
      return makeSVG(tag, attrs);
    }

    this.update = (id, dx, dy) => {
      switch (id) {
        case start.id:
          start.x += dx;
          start.y += dy;
          dom.setAttribute('x1', start.x);
          dom.setAttribute('y1', start.y);
          break;
        case end.id:
          end.x += dx;
          end.y += dy;
          dom.setAttribute('x2', end.x);
          dom.setAttribute('y2', end.y);
          break;
        default:
          console.log(`[Wire::update] Skip id ${id}`);
      }
    }

    this.delete = () => {
      dom.remove();
    }

    this.has = (id) => {
      if (start.id === id || end.id === id) {
        return true;
      } else {
        return false;
      }
    }

    this.getElement = () => {
      return dom;
    }
  }

  function genBoxId() {
    return `box-${boxNextId++}`;
  }

  function rootEventHandler(e) {
    let x = e.clientX;
    let y = e.clientY;
    switch (e.type) {
      case 'dblclick':
        if (!boxManager.pointOnBox(x, y)) {
          const box = new Box({
            x, y, id: genBoxId(), content: boxDefaultContent
          }, boxConfig);
          boxManager.addBox(box);
        }
        break;
      default:
        console.error(`[rootEventHandler] Unhandled event type: ${e.type}`);
    }
  }

  function saveState() {
    const state = {
      boxes: boxManager.getBoxes()
    };
    console.log(JSON.stringify(state));
  }

  rootEl.addEventListener('dblclick', rootEventHandler);
  boxManager.addBox(new Box({
    x: 300, y: 200, id: genBoxId(), content: boxDefaultContent
  }, boxConfig));

  saveStateBtnEl.addEventListener('click', saveState);

  // window.addEventListener('contextmenu', e => {
  //   e.preventDefault();
  // });

}

App()