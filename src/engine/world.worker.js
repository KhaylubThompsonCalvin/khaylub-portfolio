// The background worker behind worker.js: builds peak geometry and finds where props rest on the ledge.
import { peakGeometry } from './peakGeometry.js';
import { ledgeHeights } from './ledgeHeights.js';

self.onmessage = ({ data }) => {
  const { id, kind } = data;
  if (kind === 'peak') {
    const geo = peakGeometry(data.opts);
    const attributes = ['position', 'normal', 'color'].map((n) => [n, geo.attributes[n].array, geo.attributes[n].itemSize]);
    const index = geo.index.array;
    self.postMessage({ id, attributes, index }, [...attributes.map((a) => a[1].buffer), index.buffer]);
  } else if (kind === 'heights') {
    self.postMessage({ id, heights: ledgeHeights(data.meshes, data.spots) });
  }
};
