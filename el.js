$ = []

$.hijack = node => {
    node.att$ = function(name,value) {
    if (value === void 0 ||
        typeof(value) == 'boolean') {
        this.toggleAttribute(name, value)
    } else {
            this.setAttribute(name,value)
    }
        return this
    }
    node.class$ = function(name,force) {
    this.classList.toggle(name, force)
    return this;
    }
    node.ch$ = function(...children) {
        for (let ch of children){
        if (!ch) continue
            if (typeof(ch) === 'string') {
                ch = document.createTextNode(ch)
            }
            this.appendChild(ch)
        }
        return this
    }
    node.on$ = function(event, handler) {
        this.addEventListener(event, handler)
        return this
    }
    node.data$ = function(name, value) {
        this.dataset[name] = value
        return this
    }
    node.css$ = function(prop, value) {
        this.style[prop] = value
        return this
    }
    node.click$ = function(handler) {
        this.addEventListener('click', handler)
    this.att$('clickable', true)
        return this
    }
    node.map$ = function(f) {
        f(this)
        return this
    }
    node.wrap$ = function(el) {
        this.ch$ = this.ch$.bind(el)
        return this
    }
}

$.el = tagName => (...children) => {
    let node = document.createElement(tagName)
    $.hijack(node)
    node.ch$(...children)
    return node
}

$.init = () => $.hijack(document.querySelector('body'))

$.fmap = a => f => (...args) => f(a(...args))




'main section div span table tr td th spacer a img ul ol li h1 h2 h3 h4 h5 h6 p form input label textarea i rule controls b strong em kbd'.split(' ').forEach(tag => $[tag] = $.el(tag))

$.nohref = 'javascript:void(0)'


$.button    = $.fmap($.el('button'))(e=>e.att$('type','button'))
$.radio     = $.fmap($.input)(e=>e.att$('type','radio'))
$.checkbox  = $.fmap($.input)(e=>e.att$('type','checkbox'))
$.overlay   = $.fmap($.el('overlay'))(e=>
    e.map$(o=>o.toggle$ = function(force){
    o.att$('hidden', force)
    o.dispatchEvent(
        new CustomEvent(
        'toggle',
        {
            detail: { open: !o.hasAttribute('hidden') },
            bubbles: false,
            cancellable: false,
            composed: false,
        })
    )
    })
    .att$('hidden', true)
    .click$(ev=>{
        if (ev.target == e) {
        e.toggle$()
        }
    })
)

$.SPACER = -1;
$.DONE = 0;
$.CANCEL = 1;
$.DELETE = 2;
$.SAVE = 3;

$.dialog = (controls, ...children) => {
    let overlay = $.overlay()
    overlay.clear$ = function() {
    for (let ch of children) {
        if (ch instanceof HTMLInputElement) {
        ch.value = ""
        }
    }
    }
    let cs = controls.map(c => {
    if (typeof(c) === 'function') {
        return c(overlay)
    }
    switch (c) {
        case $.SPACER:
        return $.spacer()
        case $.CANCEL:
        return $.button("Cancel")
            .att$('type', 'button') // to prevent submitting
            .click$(_e=>{
                overlay.toggle$(true)
                overlay.clear$()
            })
        case $.DONE:
        return $.input()
            .att$('value', "Done")
            .att$('type', 'submit')
        case $.SAVE:
        return $.input()
            .att$('value', "Save")
            .att$('type', 'submit')
        case $.DELETE:
        return $.button("Delete")
            .att$('type', 'button')
            .map$(e=>e.classList.add('delete'))
            .click$(_e=>{
                overlay.dispatchEvent(
                new CustomEvent('delete',
                        {
                            details: {},
                            bubbles: false,
                            cancellable: false,
                            composed: false,
                }))
                overlay.toggle$(true)
                overlay.clear$()
            })
        default:
        console.warn(`Unknown control type ${c}`)
        return undefined
    }
    })
    overlay.ch$(
    $.form(
        ...children,
        $.controls(...cs),
    ).on$('submit', e=> {
        e.preventDefault()
        overlay.dispatchEvent(
        new CustomEvent('done',
                {
                    details: {},
                    bubbles: false,
                    cancellable: false,
                    composed: false,
                }))
        overlay.toggle$(true)
    }))
    .on$('toggle', e=>{
        if (e.detail.open) {
        for (let ch of children) {
            if (ch instanceof HTMLInputElement) {
            ch.focus()
            break
            }
        }
        }
    })
    return overlay
}

$.searchbox = url => $.fmap($.input)(e=>
    e.att$('type', 'search')
    .on$('keyup', ev => ev.keyCode===13 && (window.location.href = url+encodeURI(e.value)))
)

$.editor    = $.fmap($.textarea)(e=>e.on$('keydown', function(e) {
    const tab_length = 2

    const line_start = (text, start) => {
    if (start > 0) {
        for (let i = start - 1; i >= 0; i--) {
        const curr = text.charAt(i)
        if (curr === '\n') return i + 1
        }
    }
    return 0
    }

    switch (e.key) {
    case 'Tab': {
        e.preventDefault()
        const [start, end] = [this.selectionStart, this.selectionEnd].sort()
        const add_length = tab_length - (start - line_start(this.value, start)) % tab_length
        this.value = this.value.substring(0, start) + ' '.repeat(add_length) + this.value.substring(end)
        this.selectionStart = this.selectionEnd = start + add_length
        break
    }
    case 'Backspace': {
        e.preventDefault()
        const [start, end] = [this.selectionStart, this.selectionEnd].sort()
        if (start === end) { // Selection doesn't exist
        if (start === 0) return;
        let delete_length = ((start - line_start(this.value, start)) % tab_length) || tab_length
        for (let i = start - 1; i >= 0; i--) {
            const curr = this.value.charAt(i)
            if (curr === '\n' || i === 0) {
            if (start - i < tab_length || curr != ' ') delete_length = 1
            break
            }
            if (curr != ' ') { delete_length = 1; break }
        }
        delete_length = Math.min(start, delete_length)
        this.value = this.value.substring(0, start - delete_length) + this.value.substring(end)
        this.selectionStart = this.selectionEnd = start - delete_length
        } else { // A selection exists => delete it
        this.value = this.value.substring(0,start) + this.value.substring(end)
        this.selectionStart = this.selectionEnd = start
        }
        break
    }
    default:
        break
    }

}))

$.tabs = (ts, default_tab = 0) => {
    let btns = $.el('tablist')()
    let tabs = Object.getOwnPropertyNames(ts)
    let ret = $.el('tabs')(btns, ts[tabs[default_tab]]())

    ret.current_tab = default_tab
    ret.tabs = ts
    ret.update$ = () => btns.children[ret.current_tab].click()
    ret.switchTo$ = num => btns.children[num].click()
    for (let [i, t] of tabs.entries()) {
        btns.ch$(
            $.button(t)
                .map$(el=>el._tab = ret.tabs[t])
                .click$(e => {
                    let el = e.currentTarget
                    if (el._tab != ret.lastElementChild) {
                        btns.children[ret.current_tab].att$("current-tab")
                        ret.current_tab = i
                        btns.children[ret.current_tab].att$("current-tab")
                        ret.replaceChild(el._tab(), ret.lastElementChild)
                    }
                })
        )
    }
    btns.children[default_tab].att$("current-tab")
    return ret
}
