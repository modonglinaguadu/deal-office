const ipc = require('electron').ipcRenderer
const shell = require('electron').shell
const run = require('./oper.js');
const fs = require('fs')
const path = require('path')


Vue.component('modal', {
    template: '#modal-template',
    props: {
        options: {
            type: Object,
            twoWay: true
        }
    },
    data: function () {
        return {
            opts: this.options
        }
    },
    methods: {
        btnl() {
            this.$emit('btn', {
                id: 1,
                name: this.opts.name
            })
            this.opts.show = false
        },
        btnr() {
            this.$emit('btn', {
                id: 0,
                name: this.opts.name
            })
            this.opts.show = false
        }
    },
    watch: {
        options(val) {
            this.opts = val
        },

        opts(val) {
            this.$emit('update:options', val)
        }
    },
    create() {
        console.log(this.opts)
    }
})

var app = new Vue({
    el: '#app',
    data: {
        targetSelected: false,
        targetSrc: '点击选择目标文件夹',
        toSrc: '点击选择生成文件夹',
        toSelected: false,
        table: [{
            name: '表1',
            data: [{
                target: '',
                content: ''
            }]
        }, ],
        addNum: 1,
        tipShow: false,
        tipCont: [],
        loading: false,
        success: false,
        content: '处理中...',
        duquFlag: false,
        archives: [],
        inpShow: false,
        inpCont: '',
        options: {
            show: false,
            title: '警告',
            name: '',
            content: 'xxx存档已存在，是否覆盖?',
            left_btn_content: '是',
            right_btn_content: '否'
        },
        duquName: '',
        deleteName: ''
    },
    directives: {
        reflect: {
            bind(el) {
                console.log(el)
            }
        }
    },
    methods: {
        seleSrc(tar) {
            ipc.send('open-file-dialog', tar)
        },
        go() {
            if (!this.targetSelected || !this.toSelected) {
                ipc.send('open-error-dialog')
            } else {
                //判断目标目录中是否有表名相同的文件夹
                var flag = true;
                var hasSameName = true;
                var isSon = true;


                var tableName = [];
                var hasName = [];
                this.table.map(item => {
                    tableName.push(item.name);
                    var cpFile = path.join(this.toSrc, item.name);
                    var isExist = fsExistsSync(cpFile)
                    if (isExist) {
                        flag = false;
                        hasName.push(item.name);
                    }
                })
                //检测表名是否有相同的
                var tableNameStr = JSON.stringify(tableName);
                tableName.map(item => {
                    if ((tableNameStr.match(new RegExp(item, "g")).length) > 1) {
                        hasSameName = false;
                    }
                })


                //判断生成目录是否是目标目录的子目录或与其是同目录
                var tag = /^\.\./;
                var inTarget = path.relative(this.targetSrc, this.toSrc);
                if (!tag.test(inTarget)) {
                    isSon = false;
                }


                //警告
                if (!hasSameName) {
                    ipc.send('open-error-dialog3')
                }

                if (!isSon) {
                    ipc.send('open-error-dialog4')
                }

                if (!flag) {
                    ipc.send('open-error-dialog2', hasName)
                }


                if (flag && hasSameName && isSon) {
                    var _self = this;
                    run(function () {
                        _self.loading = true;
                    }, [this.targetSrc, this.toSrc], this.table, function () {
                        _self.content = "处理完成"
                        _self.success = true;
                    }, function (err) {
                        _self.loading = false;
                        ipc.send('open-error-dialog1')
                    }, function (arr) {
                        _self.tipCont = arr;
                        _self.tipShow = true;
                    })
                }
            }

        },
        add(index) {
            this.table[index].data.push({
                target: '',
                content: ''
            })
        },
        remove(index, num) {
            this.table[index].data.splice(num, 1);

        },
        rm(index) {
            this.table.splice(index, 1);
        },
        addt() {
            this.table.push({
                name: '表' + (++this.addNum),
                data: [{
                    target: '',
                    content: ''
                }]
            })
        },
        close() {
            this.content = "处理中...";
            this.success = false;
            this.loading = false;
        },
        link() {
            shell.openExternal('https://github.com/modonglinaguadu/deal-office');
        },
        duquShow() {
            this.archives = getKeys();
            this.duquFlag = true;
        },
        save() {
            const arr = getKeys();
            const flag = arr.findIndex((value) => value == this.inpCont);
            if (flag == -1) {
                localStorage.setItem(this.inpCont, JSON.stringify(this.table));
                this.inpShow = false;
                this.inpCont = '';
            } else {
                this.inpShow = false;
                this.options.content = this.inpCont + '存档已存在，是否覆盖?';
                this.options.show = true;
                this.options.name = 'hasSave';
            }
        },
        answer(args) {
            // console.log(args)
            const type = args.name;
            const btn = args.id;
            switch (type) {
                case 'hasSave':
                    if (btn == 1) {
                        localStorage.setItem(this.inpCont, JSON.stringify(this.table));
                        this.options.show = false;
                        this.inpCont = '';
                    } else if (btn == 0) {
                        this.inpShow = true;
                        this.options.show = false;
                    }
                    break;
                case 'duqu':
                    if (btn == 1) {
                        this.table = JSON.parse(localStorage.getItem(this.duquName));
                        this.options.show = false;
                    } else if (btn == 0) {
                        this.options.show = false;
                    }
                    break;
                case 'delete':
                    if (btn == 1) {
                        localStorage.removeItem(this.deleteName);
                        this.archives = getKeys();
                        this.options.show = false;
                    } else {
                        this.options.show = false;
                    }
            }
        },
        duqu(name) {
            this.options.title = "提示";
            this.options.content = '若读取 ' + name + ' 存档，将覆盖当前编写表格,是否继续?';
            this.options.show = true;
            this.options.name = 'duqu';
            this.duquName = name;
        },
        deleteSave(name) {
            this.options.title = "警告";
            this.options.content = '您是否确定删除 ' + name + ' 存档?';
            this.options.show = true;
            this.options.name = 'delete';
            this.deleteName = name;
        }
    },
    created() {
        this.archives = getKeys();
    }
})

function getKeys() {
    const msg = localStorage.valueOf()
    return Object.keys(msg);
}

ipc.on('selected-directory', function (event, path, who) {
    if (who === 'target') {
        app.targetSelected = true;
        app.targetSrc = `${path}`;
    } else if (who === 'to') {
        app.toSelected = true;
        app.toSrc = `${path}`;
    }
})


function fsExistsSync(path) {
    try {
        fs.accessSync(path, fs.F_OK);
    } catch (e) {
        return false;
    }
    return true;
}