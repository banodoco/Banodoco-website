import * as H from '../../lib/helpers.js';
import { PORTRAIT_SPRITE } from '../../../assets/contributor-portraits/manifest.js';
import { CONTRIBUTOR_POOL } from '../../../content/contributors.js';

const V_STRIDE = [7, 9, 3, 11, 13, 17, 19];
const V_OFFSET = [3, 11, 5, 17, 2, 13, 8];

/** Owns one session's random salt and the atomic person-to-slot assignment. */
export function createPortraitDealer({ nodes, contributors, nodeCount }) {
  const dealSalt = (Math.random() * 0x7fffffff) | 0;

  function dealFor(variant) {
    const rnd = H.rng((((variant + 1) * 2654435761) ^ dealSalt) >>> 0);
    const order = CONTRIBUTOR_POOL.map((_, index) => index);
    for (let index = 0; index < nodeCount && index < order.length; index++) {
      const swapIndex = index + Math.floor(rnd() * (order.length - index));
      const current = order[index];
      order[index] = order[swapIndex];
      order[swapIndex] = current;
    }
    return order.slice(0, nodeCount).map((index) => CONTRIBUTOR_POOL[index]);
  }

  function seatPeople(people) {
    nodes.forEach((node, index) => {
      const person = people[index % people.length];
      if (!person) return;
      node.content.name = person.name;
      node.content.role = person.role;
      node.content.blurb = person.blurb;
      const staticRow = contributors.find((candidate) => candidate.id === node.id);
      if (staticRow) {
        staticRow.name = person.name;
        staticRow.role = person.role;
        staticRow.blurb = person.blurb;
      }
      node.content.avatar = {
        url: PORTRAIT_SPRITE.url,
        col: person.sprite.col,
        row: person.sprite.row,
        cols: PORTRAIT_SPRITE.cols,
        rows: PORTRAIT_SPRITE.rows,
      };
    });
  }

  function photoSpecs(variant, photoSheet, grade) {
    const stride = V_STRIDE[variant % V_STRIDE.length];
    const offset = V_OFFSET[variant % V_OFFSET.length];
    const people = dealFor(variant);
    const tile = PORTRAIT_SPRITE.tile;
    return nodes.map((node, index) => {
      const permutationIndex = index * stride + offset;
      const person = people[index % people.length];
      return {
        img: photoSheet,
        sx: person.sprite.col * tile,
        sy: person.sprite.row * tile,
        sw: tile,
        sh: tile,
        bustSeed: (node.content.seed ?? index + 1) * 131 + index * 7 + variant * 9973,
        mirror: false,
        exposure: 0.90 + ((index * 29 + variant * 7 + permutationIndex) % 13) / 13 * 0.26,
        warmth: ((index * 17 + variant * 3) % 11) / 11,
        seed: 5000 + index * 37 + variant * 911,
        grade,
      };
    });
  }

  return { dealFor, seatPeople, photoSpecs };
}
