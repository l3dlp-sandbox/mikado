/**!
 * Mikado.js
 * Copyright 2019-2024 Nextapps GmbH
 * Author: Thomas Wilkerling
 * Licence: Apache-2.0
 * https://github.com/nextapps-de/mikado
 */

import { TemplateDOM, Template, MikadoOptions, MikadoCallbacks, NodeCache } from "./type.js";
import Observer from "./array.js";
import { create_path, construct } from "./factory.js";
import proxy_create from "./proxy.js";
import { tick } from "./profiler.js";

/** @const {Object<string, Mikado|Array<Template, MikadoOptions>>} */
export const includes = Object.create(null);

/**
 * Abbrevations:
 * _mkd: _dom
 * _mkl: _live
 * _mki: _instance
 */

/**
 * NOTE: Using prototype enables conditional instance member functions.
 * @param {!string|Template} template
 * @param {MikadoOptions=} options
 * @constructor
 */

export default function Mikado(template, options = /** @type MikadoOptions */{}) {

    if (!(this instanceof Mikado)) {

        return new Mikado(template, options);
    }

    if ("string" == typeof template) {

        const tpl = includes[template];

        if (!tpl) {

            throw new Error("The template '" + template + "' is not registered.");
        }


        if (tpl instanceof Mikado) {

            return tpl;
        }

        template = /** @type Template */tpl[0];
        options || (options = /** @type MikadoOptions */tpl[1]);
    }

    if (!template) {

        throw new Error("Initialization Error: Template is not defined.");
    }

    if (!template.tpl /*|| !template.name*/) {

            throw new Error("Initialization Error: Template isn't supported.");
        }

    /** @type {Array<!Element>} */
    this.dom = [];
    /** @type {number} */
    this.length = 0;
    /** @type {?Element} */
    this.root = options.root || options.mount || null;
    /** @const {boolean} */
    this.recycle = !!options.recycle;
    /** @type {*} */
    this.state = options.state || {};
    /** @type {boolean} */
    this.shadow = options.shadow || !!template.cmp;

    /** @const {string} */
    this.key = template.key || "";
    /**
     * @private
     * @dict {Object<string, Element>}
     */
    this.live = {};

    /** @type {Array<Function>} */
    const fn = template.fn;
    // make a copy to make this template re-usable when consumed
    // this should just have been copied when it is a root template!
    template.fc || fn && (template.fc = fn.slice());
    /**
     * The compiler unshift includes, so we can use faster arr.pop() here, because it needs reverse direction.
     * Let consume the nested template functions by using .pop() is pretty much simpler than using an index.
     * @private {Function}
     */
    this.apply = fn && fn.pop();
    /** @type {Template|null} */
    this.tpl = template;
    /** @const {string} */
    this.name = template.name;

    /*
     * Includes are filled with Mikado instances when factory is constructed
     * @const {Array<Mikado>}
     */
    this.inc = [];

    const cacheable = this.recycle || !!this.key;

    /** @const {boolean|number} */
    this.pool = cacheable && options.pool || 0;
    /** @private {Array<Element>} */
    this.pool_shared = [];

    /** @private */
    this.pool_keyed = new Map();


    /** @const {boolean} */
    this.cache = cacheable && (template.cache || !!options.cache);


    /** @type {boolean} */
    this.async = !!options.async;
    /** @private {number} */
    this.timer = 0;


    /** @private {MikadoCallbacks|null} */
    this.on = options.on || null;
    {

        /**
         * @type {Object<string, Array<string, number>>}
         */
        this.proxy = null;
        /** @type {number} */
        this.fullproxy = 0;
        /** @type {Observer|undefined} */
        const store = options.observe;

        if (store) {

            new Observer(store).mount(this);
        }
    }

    if (this.root) {

        this.mount(this.root, options.hydrate);
    } else {

        /** @private */
        this.factory = null;
    }
}

/**
 * This function is also automatically called when loading es5 templates.
 * @param {string|Template} tpl
 * @param {MikadoOptions=} options
 */

export function register(tpl, options) {

    let name, re_assign;

    if ("string" == typeof tpl) {

        name = re_assign = tpl;
        tpl = /** @type {string|Template} */includes[name];
        tpl instanceof Mikado || (tpl = tpl[0]);

        if (!tpl) {

            throw new Error("The template '" + name + "' was not found.");
        }
    } else {

        name = tpl.name;
    }

    if (includes[name]) {

        if (re_assign) {

            console.info("The template '" + name + "' was replaced by a new definition.");
        } else {

            console.warn("The template '" + name + "' was already registered and is getting overwritten. When this isn't your intention, then please check your template names about uniqueness and collision!");
        }
    }

    // Just collect template definitions. The instantiation starts when .mount() is
    // internally called for the first time.

    includes[name] = [
    /** @type {Template} */tpl,
    /** @type {MikadoOptions} */options];

    return Mikado;
}

/**
 * @param {string|Template} name
 */

export function unregister(name) {

    if ("object" == typeof name) {

        name = /** @type {string} */name.name;
    }

    const mikado = includes[name];

    if (mikado) {

        mikado instanceof Mikado && mikado.destroy();
        includes[name] = null;
    }

    return Mikado;
}

/*

    Example: Swap Mount

    A[DOM] B[DOM]
    A[TPL] A[TPL]

    A[DOM] A[DOM]
    A[TPL] B[TPL]

 */

/**
 * @param {Element} target
 * @param {boolean=} hydrate
 * @returns {Mikado}
 * @const
 */

Mikado.prototype.mount = function (target, hydrate) {

    if (!target) {

        throw new Error("No target was passed to .mount()");
    }


    // cancel async render task if scheduled
    this.timer && this.cancel();


    if (this.shadow) {

        // Actually the MIKADO_CLASS will append to the templates root element,
        // but it would be better to have it on the mounting element
        // TODO improve getting the root withing components by assigning MIKADO_ROOT to the mounting element

        const cmp = /** @type {Array<TemplateDOM>} */this.tpl.cmp;
        // also when cmp: [] has no definitions at top level scope
        target = target.shadowRoot || target.attachShadow({ mode: "open" });

        if (cmp && cmp.length) {

            // the root is always the last element
            const tmp = target.lastElementChild;

            if (tmp /*&& tmp.tagName === "ROOT"*/) {

                    target = tmp;
                } else {
                // push root as the last element
                cmp.push({ tag: "root" });

                /** @type {TemplateDOM} */


                for (let i = 0, node; i < cmp.length; i++) {

                    node = construct(this, /** @type {TemplateDOM} */cmp[i], [], "");
                    target.append(node);

                    if (i === cmp.length - 1) {

                        // the root element is the last one
                        target = /** @type {Element} */node;
                    }
                }
            }
        }
    }

    const target_instance = target._mki,
          root_changed = this.root !== target;


    if (target_instance === this) {

        // same template, same root

        if (!root_changed) return this;

        // same template, different root

        this.dom = target._mkd;
        this.length = this.dom.length;
    } else if (target_instance) {

        target_instance.clear();

        // different template

        target._mkd = this.dom = [];
        this.length = 0;

        if (target.firstChild) {
            target.textContent = "";
        }

        const callback = this.on && this.on.unmount;
        callback && callback(target, target_instance);
    } else {

        // initial mount

        if (hydrate) {

            this.dom = collection_to_array(target.children);
            this.length = this.dom.length;
        } else {

            this.dom = [];
            this.length = 0;

            if (target.firstChild) {
                target.textContent = "";
            }
        }

        target._mkd = this.dom;
    }

    if (this.key) {

        // handle live pool

        if (root_changed && this.root) {

            this.root._mkl = this.live;
        }

        if (target_instance === this) {

            this.live = target._mkl;
        } else {

            const live = {};

            if (!target_instance && hydrate && this.length) {

                for (let i = 0, node, key; i < this.length; i++) {

                    node = this.dom[i];
                    // server-side rendering needs to export the key as attribute
                    key = node.getAttribute("key");

                    if (!key) {

                        console.warn("The template '" + this.name + "' runs in keyed mode, but the hydrated component don't have the attribute 'key' exported.");
                    }


                    node._mkk = key;
                    live[key] = node;
                }
            }

            target._mkl = this.live = live;
        }
    }

    target._mki = this;
    this.root = target;

    if (!this.factory) {

        if (hydrate && this.length) {

            /** @private */
            this.factory = this.dom[0].cloneNode(!0);
            construct(this, /** @type {TemplateDOM} */this.tpl.tpl, [], "", this.factory) && finishFactory(this);
        }

        // also when falls back on hydration if structure was incompatible:

        if (this.tpl) {

            /** @private */
            this.factory = construct(this, /** @type {TemplateDOM} */this.tpl.tpl, [], "");
            finishFactory(this);
        }
    }

    const callback = this.on && this.on.mount;
    callback && callback(target, this);

    return this;
};

/**
 * @param {Mikado} self
 */

function finishFactory(self) {

    if (self.tpl.fc) {

        // self.tpl.fn could have further template functions

        self.tpl.fn = self.tpl.fc;
        self.tpl.fc = null;
    }

    self.tpl = null;
}

/**
 * @param {NodeList} collection
 * @return {Array<Element>}
 */

function collection_to_array(collection) {
    const length = collection.length,
          array = Array(length);


    for (let i = 0; i < length; i++) {

        array[i] = collection[i];
    }

    return array;
}

/**
 * @param {Element|ShadowRoot} root
 * @param {Template} template
 * @param {Array<Object>|Object|Function|boolean=} data
 * @param {*|Function|boolean=} state
 * @param {Function|boolean=} callback
 * @const
 */

export function once(root, template, data, state, callback) {

    if (!root) {

        throw new Error("Root element is not defined.");
    }

    if (!template) {

        throw new Error("Template is not defined.");
    }


    let mikado;

    if ("function" == typeof data || !0 === data) {

        callback = data;
        data = null;
    } else if ("function" == typeof state || !0 === state) {

        callback = state;
        state = null;
    }

    if (callback) {

        return new Promise(function (resolve) {

            requestAnimationFrame(function () {

                once(root, template, data, state);
                if ("function" == typeof callback) callback();
                resolve();
            });
        });
    }
    const is_shadow = template.cmp,
          is_component = is_shadow && is_shadow.length;


    if (is_shadow && !is_component) {

        // switch to shadow root

        root = root.shadowRoot || root.attachShadow({ mode: "open" });
    }

    if (!data && !is_component && !template.fn) {

        // static non-looped templates
        // uses the low-level template factory constructor

        const node = construct(
        /** @type {!Mikado} */{},
        /** @type {TemplateDOM} */template.tpl, [], "", null, 1);

        root.append(node);
    } else {

        mikado = new Mikado(template);

        if (is_component) {

            // full declared web components needs to be mounted

            root = mikado.mount(root).root;
        }

        if (data && Array.isArray(data)) {

            // looped templates

            for (let i = 0; i < data.length; i++) {

                root.append(mikado.create(data[i], state, i));
            }
        } else {

            // dynamic non-looped templates + web components

            root.append(mikado.create(data, state));
        }

        mikado.destroy();
    }

    return Mikado;
}

/**
 * @param {!*} data
 * @param {*=} state
 * @param {Function|boolean=} callback
 * @param {boolean|number=} _skip_async
 * @returns {Mikado|Promise}
 * @const
 */

Mikado.prototype.render = function (data, state, callback, _skip_async) {

    if (!this.root) {

        throw new Error("Template was not mounted or root was not found.");
    } else if (this.root._mki !== this) {

        throw new Error("Another template is already assigned to this root. Please use '.mount(root_element)' before calling '.render()' to switch the context of a template.");
    }


    if (!_skip_async) {

        let has_fn;

        if (state && (has_fn = "function" == typeof state) || !0 === state) {

            callback = /** @type {Function|boolean} */state;
            state = null;
        }

        if (this.timer) {

            this.cancel();
        }

        if (this.async || callback) {

            const self = this;
            has_fn || (has_fn = "function" == typeof callback);

            self.timer = requestAnimationFrame(function () {

                self.timer = 0;
                self.render(data, state, null, 1);
                /*has_fn &&*/ /** @type {Function} */callback();
            });

            return has_fn ? this : new Promise(function (resolve) {

                callback = resolve;
            });
        }
    }

    //profiler_start("render");

    let length = this.length;

    // a template could have just expressions without accessing data

    if (!data) {

        if (!this.apply) {

            this.dom[0] || this.add();
            return this;
        }
    }

    let count;

    if (Array.isArray(data) || data instanceof Observer) {

        count = data.length;

        if (!count) {

            return this.remove(0, length);
        }
    } else {

        if (this.proxy) {

            throw new Error("When a template is using data bindings by an expression like {{= ... }} you will need to pass an array to the render() function, also when just one single item should be rendered. Because the array you will pass in is getting proxified after calling .render(arr), after then you can trigger bindings via arr[0].prop = 'value'.");
        }

        data = [data];
        count = 1;
    }

    const key = this.key,
          proxy = this.proxy;


    if (length && !key && !this.recycle) {

        this.remove(0, length);
        length = 0;
    }

    let min = length < count ? length : count,
        x = 0;


    // update
    if (x < min) {

        for (let node, item; x < min; x++) {

            node = this.dom[x];
            item = data[x];

            if (key && node._mkk !== item[key]) {

                return this.reconcile( /** @type {Array} */data, state, x);
            } else {

                this.update(node, item, state, x, 1);
            }

            if (proxy && /* !this.recycle || */!item._mkx) {

                data[x] = apply_proxy(this, node, item);
            }
        }
    }

    // add
    if (x < count) {

        for (; x < count; x++) {

            const item = data[x];
            this.add(item, state /*, x*/);

            if (proxy && (!this.recycle || !item._mkx)) {

                data[x] = apply_proxy(this, this.dom[x], item);
            }
        }
    }

    // remove
    else if (count < length) {

            this.remove(count, length - count);
        }
    //}

    //profiler_end("render");

    return this;
};

/**
 * param {!Element|number} node
 * param {*=} data
 * param {*=} state
 * param {number=} index
 * @const
 */

Mikado.prototype.replace = function (node, data, state, index) {

    //profiler_start("replace");

    if ("undefined" == typeof index) {

        if ("number" == typeof node) {

            index = 0 > node ? this.length + node : node;
            node = this.dom[index];
        } else {

            index = this.index(node);
        }
    }

    let tmp, update;

    // The main difference of replace() to update() is that replace() will properly handle the keyed live pool.

    if (this.key) {

        const key = data[this.key];

        if (tmp = this.live[key]) {

            if (tmp !== node) {
                const index_old = this.index(tmp),
                      node_a = index_old < index ? tmp : node,
                      node_b = index_old < index ? node : tmp;

                let next = this.dom[index_old < index ? index_old + 1 : index + 1]; // node_a.nextSibling;

                this.dom[index] = tmp;
                this.dom[index_old] = node;

                // if(next === node_b){
                //
                //     this.root.insertBefore(node_b, node_a);
                // }
                // else{

                if (next !== node_b) {

                    this.root.insertBefore(node_a, node_b);
                } else {

                    next = node_a;
                }

                this.root.insertBefore(node_b, next);
                //}
            }
        } else if (this.pool && (tmp = this.pool_keyed.get(key))) {

            this.pool_keyed.delete(key);
            this.checkout(node);
            this.dom[index] = tmp;
            node.replaceWith(tmp);
        }

        update = tmp;
    } else if (this.recycle) {

        update = node;
    }

    if (update) {

        this.fullproxy && data._mkx || !this.apply || this.apply(data, state || this.state, index, update._mkp || create_path(update, this.factory._mkp, this.cache));
    } else {

        const clone = this.create(data, state, index, 1);

        if (this.key || this.pool) {

            this.checkout(node);
        }

        this.dom[index] = clone;
        node.replaceWith(clone);
    }

    const callback = this.on && this.on.replace;
    callback && callback(node, this);

    //profiler_end("replace");

    return this;
};

/**
 * @param {Element|number} node
 * @param {*=} data
 * @param {*=} state
 * @param {number=} index
 * @param {boolean|number=} _skip_check
 * @const
 */

Mikado.prototype.update = function (node, data, state, index) {

    //profiler_start("update");

    if (!this.apply) {

        console.warn("The template '" + this.name + "' is a static template and should not be updated. Alternatively you can use .replace() to switch contents.");


        return this;
    }

    if (this.fullproxy && data._mkx) {

        return this;
    }

    if ("undefined" == typeof index) {

        if ("number" == typeof node) {

            index = 0 > node ? this.length + node - 1 : node;
            node = this.dom[index];
        } else {

            index = this.index(node);
        }
    }

    node = /** @type {Element} */node;

    // Is keyed handling also needed in update?
    // .replace() = .update() + keyed handling

    /*
    if(!_skip_check){
          let replace;
          if(SUPPORT_KEYED && this.key){
              const ref = node[MIKADO_TPL_KEY];
            const tmp = data[this.key];
              if(ref !== tmp){
                  if(this.recycle){
                      this.live[ref] = null;
                    this.live[tmp] = node;
                    node[MIKADO_TPL_KEY] = tmp;
                }
                else{
                      replace = true;
                }
            }
        }
        else if(!this.recycle){
              replace = true;
        }
          if(replace){
              return this.replace(node, data, state, index);
        }
    }
    */

    this.apply(data, state || this.state, index, node._mkp || create_path(node, this.factory._mkp, this.cache));

    //profiler_end("update");

    const callback = this.on && this.on.update;
    callback && callback(node, this);

    return this;
};

/** @const */
Mikado.prototype.cancel = function () {

    //if(this.timer){

    cancelAnimationFrame(this.timer);
    this.timer = 0;
    //}

    return this;
};

/**
 * @param {*=} data
 * @param {*=} state
 * @param {number=} index
 * @param {boolean|number=} _update_pool
 * @return {!Element}
 * @const
 */

Mikado.prototype.create = function (data, state, index, _update_pool) {
    const keyed = this.key,
          key = keyed && data[keyed];

    let node, pool, factory, found;

    if (this.pool) {

        // 1. shared keyed pool
        if (keyed) {

            if ((pool = this.pool_keyed) && (node = pool.get(key))) {
                pool.delete(key);
                found = 1;
            }
        }
        // 2. shared non-keyed pool
        else if ((pool = this.pool_shared) && pool.length) {
                node = pool.pop();
            }
    }

    if (!node) {

        node = factory = this.factory;

        if (!factory) {

            /** @private */
            this.factory = node = factory = construct(this, /** @type {TemplateDOM} */this.tpl.tpl, [], "");
            finishFactory(this);
        }
    }

    let cache;

    if (this.apply) {

        cache = this.apply(data, state || this.state, index, node._mkp || create_path(node, this.factory._mkp, !!factory || this.cache), factory && this.cache && /** @type {Array<NodeCache>} */[]);
    }

    if (factory) {
        node = factory.cloneNode(!0);

        if (cache) {

            node._mkc = cache;
        }
    }

    if (keyed) {

        if (!found) node._mkk = key;
        if (_update_pool) this.live[key] = node;
    }

    const callback = this.on && this.on[factory ? "create" : "recycle"];
    callback && callback(node, this);

    return node;
};

/**
 * @param {*=} data
 * @param {*|number=} state
 * @param {number|null=} index
 * @returns {Mikado}
 * @const
 */

Mikado.prototype.add = function (data, state, index) {
    //profiler_start("add");

    let has_index;

    if ("number" == typeof state) {

        index = 0 > state ? this.length + state : state;
        state = null;
        has_index = index < this.length;
    } else if ("number" == typeof index) {

        if (0 > index) index += this.length;
        has_index = index < this.length;
    } else {

        index = this.length;
    }

    const node = this.create(data, state, index, 1);

    //if(SUPPORT_STORAGE) {

    //let stealth_mode;

    // if(SUPPORT_REACTIVE && this.proxy){
    //
    //     if(this.stealth && this.loose && (node["_data"] === data)){
    //
    //         stealth_mode = 1;
    //     }
    //     else{
    //
    //         data["_proxy"] || (data = proxy_create(data, node["_path"] || this.create_path(node), this.proxy));
    //     }
    // }

    // if(!stealth_mode){
    //
    //     if(this.store){
    //
    //         if(has_index && !this.extern){
    //
    //             splice(this.store, this.length - 1, length, data);
    //             //this.store.splice(length, 0, data);
    //         }
    //         else{
    //
    //             if(SUPPORT_REACTIVE) this.skip = 1;
    //             this.store[length] = data;
    //             if(SUPPORT_REACTIVE) this.skip = 0;
    //         }
    //     }
    //     else if(this.loose){
    //
    //         node["_data"] = data;
    //     }
    // }
    //}

    if (has_index) {

        this.root.insertBefore(node, this.dom[index]);
        splice(this.dom, this.length - 1, index, node);
        //this.dom.splice(length, 0, node);
        this.length++;
    } else {

        this.root.appendChild(node);
        this.dom[this.length++] = node;
    }

    const callback = this.on && this.on.insert;
    callback && callback(node, this);

    //profiler_end("add");

    return this;
};

/**
 * @param {Mikado} self
 * @param {Element} node
 * @param {Object} data
 * @return {Proxy}
 */

export function apply_proxy(self, node, data) {

    return proxy_create(data, node._mkp || create_path(node, self.factory._mkp, self.cache), self.proxy);
}

// Since there don't exist a native transaction feature for DOM changes, all changes applies incrementally.
// For a full render task there are a "dirty" intermediate state when moving one node.
// This state will resolve after running through the whole reconcile().
// Since we don't use an extra loop running upfront to calculate the diff,
// Mikado uses a smart algorithm which can find the shortest path in one loop.
// That also means, during reconcile there is no look-ahead to the data (just to the live pool).
// For this reason the keyed live pool needs to be in sync with the vdom array.
// The reconcile runs like a resizable "window function" on where unmatched things
// will move further to the end until the process cursor reach this index.

/**
 * Reconcile based on "longest distance" strategy by Thomas Wilkerling
 * @param {Array=} b
 * @param {*=} state
 * @param {number=} x
 * @returns {Mikado}
 * @const
 */

Mikado.prototype.reconcile = function (b, state, x) {
    const a = this.dom,
          live = this.live,
          key = this.key;
    let end_b = b.length,
        end_a = a.length,
        max_end = end_a > end_b ? end_a : end_b,
        shift = 0;

    //let steps = 0;

    for (x || (x = 0); x < max_end; x++) {

        let found;

        if (x < end_b) {
            const b_x = b[x],
                  ended = x >= end_a;
            let a_x, b_x_key, a_x_key, proxy;


            if (this.proxy) {

                if (!b_x._mkx) {

                    b[x] = apply_proxy(this, a[x], b_x);
                } else {

                    proxy = 1;
                }
            }

            if (!ended) {

                a_x = a[x];
                b_x_key = b_x[key];
                a_x_key = a_x._mkk;

                if (a_x_key === b_x_key) {

                    //if(!_skip_render){
                    proxy || this.update(a_x, b_x, state, x, 1);
                    //}

                    continue;
                }
            }

            if (ended || !live[b_x_key]) {

                //if(!_skip_render){

                // without pool enabled .add() is better than .replace()

                if (ended || !this.pool) {

                    end_a++;
                    max_end = end_a > end_b ? end_a : end_b;

                    this.add(b_x, state, x);
                } else {

                    this.replace(a_x, b_x, state, x);
                }
                //}

                continue;
            }

            let idx_a, idx_b;

            for (let y = x + 1; y < max_end; y++) {

                // determine longest distance
                if (!idx_a && y < end_a && a[y]._mkk === b_x_key) idx_a = y + 1;
                if (!idx_b && y < end_b && b[y][key] === a_x_key) idx_b = y + 1;

                if (idx_a && idx_b) {

                    // shift up (move target => current)
                    if (idx_a >= idx_b + shift) {

                        const tmp_a = a[idx_a - 1];

                        // when distance is 1 it will always move before, no predecessor check necessary
                        this.root.insertBefore( /** @type {Node} */tmp_a, /** @type {Node} */a_x);

                        //if(!_skip_render){
                        proxy || this.update(tmp_a, b_x, state, x, 1);
                        //}

                        // fast path optimization when distance is equal (skips finding on next turn)

                        //steps++;
                        if (idx_a === idx_b) {

                            if (1 < y - x) {

                                this.root.insertBefore( /** @type {Node} */a_x, /** @type {Node} */a[idx_a]);
                            }

                            a[x] = a[y];
                            a[y] = /** @type {!Element} */a_x;

                            //steps++;
                            if (!a_x) console.error("reconcile.error 1");
                        } else {

                            if (idx_a - 1 === x) console.error("reconcile.error 2");


                            splice(a, idx_a - 1, x);
                            //a.splice(x, 0, a.splice(idx_a - 1, 1)[0]);

                            shift++;
                        }
                    }
                    // shift down (move current => target)
                    else {

                            const index = idx_b - 1 + shift;

                            // distance is always greater than 1, no predecessor check necessary
                            this.root.insertBefore( /** @type {Node} */a_x, /** @type {Node} */a[index] || null);

                            if ((index > end_a ? end_a : index) - 1 === x) console.error("reconcile.error 3");


                            splice(a, x, (index > end_a ? end_a : index) - 1);
                            //a.splice(/* one is removed: */ index - 1, 0, a.splice(x, 1)[0]);

                            shift--;

                            //steps++;
                            x--;
                        }

                    found = 1;
                    break;
                }
            }
        }

        if (!found) {

            this.remove(x);

            end_a--;
            max_end = end_a > end_b ? end_a : end_b;
            x--;
        }
    }

    //if(steps) console.log(steps);

    return this;
};

/**
 * @param {Array} arr
 * @param {number} pos_old
 * @param {number} pos_new
 * @param {*=} insert
 * @const
 */

function splice(arr, pos_old, pos_new, insert) {

    const tmp = insert || arr[pos_old];

    if (insert) {

        pos_old++;
    }

    if (pos_old < pos_new) {

        for (; pos_old < pos_new; pos_old++) {

            arr[pos_old] = arr[pos_old + 1];
        }
    } else /*if(pos_old > pos_new)*/{

            for (; pos_old > pos_new; pos_old--) {

                arr[pos_old] = arr[pos_old - 1];
            }
        }

    arr[pos_new] = tmp;
}

/**
 * @param {*=} data
 * @param {*=} state
 * @param {number=} index
 * @const
 */

Mikado.prototype.append = function (data, state, index) {
    //profiler_start("append");

    let has_index;

    if ("number" == typeof state) {

        index = 0 > state ? this.length + state : state;
        state = null;
        has_index = 1;
    } else if ("number" == typeof index) {

        if (0 > index) index += this.length;
        has_index = 1;
    }

    const count = data.length;

    for (let x = 0; x < count; x++) {

        this.add(data[x], state, has_index ? index++ : null);
    }

    //profiler_end("append");

    return this;
};

/**
 * @returns {Mikado}
 * @const
 */

Mikado.prototype.clear = function () {

    if (this.length) {

        this.remove(0, this.length);
    }

    return this;
};

/**
 * @param {!Element|number} index
 * @param {number=} count
 * @returns {Mikado}
 * @const
 */

Mikado.prototype.remove = function (index, count) {

    //profiler_start("remove");

    let length = this.length;

    if (length && index) {

        if ("number" != typeof index) {

            index = this.index(index);
        } else if (0 > index) {

            index = length + index;
        }
    }

    if (!length || index >= length) {

        //profiler_end("remove");

        return this;
    }

    if (count) {

        if (0 > count) {

            index -= count + 1;

            if (0 > index) {

                index = 0;
            }

            count *= -1;
        }
    } else {

        count = 1;
    }

    let nodes;

    if (!index && count >= length) {

        nodes = this.dom;
        count = nodes.length;
        this.root.textContent = "";
        this.root._mkd = this.dom = [];
        length = 0;
    } else {

        nodes = this.dom.splice( /** @type {number} */index, count);
        length -= count;
    }

    // reverse is applied in order to use push/pop rather than shift/unshift
    // when no keyed pool is used a proper order of items will:
    // 1. optimize the pagination of content (forward, backward)
    // 2. optimize toggling the count of items per page (list resizing)
    // 3. optimize folding of content (show more, show less)

    const reverse = this.pool && !this.key,
          checkout = this.key || this.pool,
          callback = this.on && this.on.remove;


    // TODO
    // 1. checkout multiple keyed nodes
    // 2. when count > this.pool it should assign new Map() instead
    // 3. handle oversize checkouts (count > this.pool) to add items later

    // const resize = SUPPORT_KEYED && SUPPORT_POOLS && count > 1 && this.key && this.pool && this.pool !== true && ((this.pool_keyed.size + count) - this.pool);
    //
    // if(resize){
    //
    //     if(count >= this.pool){
    //
    //         this.pool_keyed = new Map();
    //     }
    //     else{
    //
    //         this.pool_keyed._keys = this.pool_keyed.keys();
    //     }
    // }

    for (let x = 0, node; x < count; x++) {

        node = nodes[reverse ? count - x - 1 : x];
        length && node.remove(); //this.root.removeChild(node);
        checkout && this.checkout(node);
        callback && callback(node, this);
    }

    // if(resize){
    //
    //     this.pool_keyed._keys = null;
    // }

    this.length = length;

    //profiler_end("remove");

    return this;
};

/**
 * param {Element} node
 * @return {number}
 * @const
 */

Mikado.prototype.index = function (node) {

    return this.dom.indexOf(node);
};

/**
 * param {number} index
 * @return {Element}
 * @const
 */

Mikado.prototype.node = function (index) {

    return this.dom[index];
};

/**
 * param {Element} node
 * @private
 * @const
 */

Mikado.prototype.checkout = function (node) {

    let key;

    if (this.key) {

        key = node._mkk;

        //if(key || key === 0){

        // remove from live-pool
        this.live[key] = null;
        //}
    }

    if (this.pool) {

        if (key) {

            // always adding to keyed shared-pool increases the probability of matching keys
            // but requires resizing of limited pools
            this.pool_keyed.set(key, node);

            if (!0 !== this.pool && this.pool_keyed.size > this.pool) {

                this.pool_keyed.delete( /*this.pool_keyed._keys ||*/this.pool_keyed.keys().next().value);
            }
        } else {

            const length = this.pool_shared.length;

            if (!0 === this.pool || length < this.pool) {

                // add to non-keyed shared-pool
                this.pool_shared[length] = node;
            }
        }
    }
};


Mikado.prototype.flush = function () {

    this.pool_shared = [];

    this.pool_keyed = new Map();


    return this;
};

/**
 * @const
 */

Mikado.prototype.destroy = function () {

    for (let i = 0, inc; i < this.inc.length; i++) {

        inc = this.inc[i];
        includes[inc.name] || inc.destroy();
    }

    if (this.key) {

        this.root && (this.root._mkl = null);
        this.live = null;
    }

    if (this.root) {

        this.root._mkd = this.root._mki = null;
    }

    /** @suppress {checkTypes} */this.dom = this.root = this.tpl = this.apply = this.inc = this.state = this.factory = null;

    this.pool_shared = null;

    this.pool_keyed = null;


    this.on = null;


    this.proxy = null;
};