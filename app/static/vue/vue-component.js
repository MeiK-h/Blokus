function show_message(message){
    $("#hit_nag_message").text(message)
    $("#hit_nag").nag('show')
    $("#hit_nag").nag('clear')
}

Vue.component("user-item", {
    props: ['user'],
    template: `
        <div>
            <a v-show="!logged" class="ui labeled icon teal button" href="javascript:void(0)" onclick="$('#login').modal('show')">
                <i class="sign in icon"></i>
                登录</a>
            <a v-show="!logged" class="ui labeled icon teal button" href="javascript:void(0)" onclick="$('#regiester').modal('show')">
                <i class="add user icon"></i>
                注册</a>
            <a v-show="logged" class="ui basic black right labeled icon dropdown">
                <div class="text">{{user.username}}</div>
                <i class="dropdown icon"></i>
                <div class="menu">
                    <a class="item" :href="my_index"><i class="user icon"></i>我的主页</a>
                    <div class="item"><i class="setting icon"></i>设置</div>
                    <div class="item" v-on:click="logout"><i class="sign out icon"></i>退出</div>
                </div>
            </a>
        </div>`,
    methods: {
        logout: function(){
            $.ajax({
                type: "DELETE",
                url: "/api/users/online",
                success: function(data){
                    if (data.message == "success"){
                        show_message("退出登录成功")
                        user_item.user = Object.assign(user_item.user, data.result)
                    }
                    else{
                        show_message(data.message)
                    }
                },
                error: function(data){
                    show_message("请求失败，请检查网络连接")
                }
            })
        }
    },
    computed: {
        logged: function(){
            return this.user.user_id !== -1
        },
        my_index: function(){
            return "/users?user_id=" + this.user.user_id
        }
    }
});

Vue.component("user-data", {
    props: ['user'],
    template: `
    <div class="ui centered grid">
        <div class="row">
            <h1 style="font-size: 8em"> {{user.username}} </h1>
        </div>
        <div class="segment">
            <div class="ui statistic">
                <div class="value">
                    {{rate_of_victory}}
                </div>
                <div class="label">胜率</div>
            </div>
            <div class="ui huge statistic">
                <div class="value">
                    {{user.user_info.rating}}
                </div>
                <div class="label">rating</div>
            </div>
            <div class="ui statistic">
                <div class="value">
                    {{user.user_info.number_of_victory}}
                </div>
                <div class="label">获胜场次</div>
            </div>
            <div class="ui statistic">
                <div class="value">
                    {{user.user_info.number_of_battles}}
                </div>
                <div class="label">总场次</div>
            </div>
        </div>
    </div>`,
    computed: {
        rate_of_victory: function(){
            return (this.user.user_info.rate_of_victory * 100).toFixed(2) + "%"
        }
    }
})

function try_join(player_id){
    if (!check_login()) return
    $.post("/api/battles/" + battle_inferface.battle_data.battle_id + "/players/" + player_id, {}, function(data){
        if(data.message != "success"){
            show_message(data.message)
            return
        }
        battle_inferface.battle_data = data.result
    })
}

function try_leave(player_id, call_back){
    if (!check_login()) return
    $.ajax({
        method: "delete",
        url:"/api/battles/" + battle_inferface.battle_data.battle_id + "/players/" + player_id, 
        success: function(data){
            if(data.message != "success"){
                show_message(data.message)
                return
            }
            battle_inferface.battle_data = data.result
            if (typeof(call_back) != "undefined")
                call_back()
        },
        error: function(data){
            if (typeof(call_back) != "undefined")
                call_back()
        }
    })
}

Vue.component("playerinfo-item",{
    props: ['player_info', 'item_id', 'player_id', 'description_type'],
    template: `
        <div class="item" 
            :class="{link: !occupied}" 
            @mouseenter="dimmer('show')"
            @mouseleave="dimmer('hide')"
            @click="change">
            <img class="ui avatar image" :src="image_path">
            <div class="content">
                <div class="header">{{user_name}}</div>
                <div class='description'>{{description}}</div>
            </div>
            <div class="ui dimmer" :id="'playerinfo_item_' + item_id" @click="operator">
                <div class="content">
                    {{player_id !== -1 ? '离开': '加入'}}
                    <i class="ui icon" :class="{close: player_id !== -1}"></i>
                </div> 
            </div>
        </div>`,
    methods: {
        operator: function(){
            this.dimmer('hide')
            if (this.player_id === -1){
                if (this.occupied)
                    return
                try_join(this.item_id)
            }
            else{
                try_leave(this.item_id)
            }
        },
        change: function(){
            if (this.player_id != this.item_id &&this.player_id !== -1){
                try_leave(this.player_id)
                try_join(this.item_id)
            }

        },
        dimmer: function(argument){
            if ((this.player_id != -1 && this.item_id != this.player_id) || this.occupied)
                return
            $("#playerinfo_item_"+this.item_id).dimmer(argument);
        }
    },
    computed: {
        occupied: function () {
            return this.player_info.user_id != -1 && this.item_id != this.player_id
        },
        user_name: function () {
            if (this.player_info.user_id == -1)
                return ""
            return this.player_info.user_data.username
        },
        image_path: function () {
            return "static/common/images/" + (1 << this.item_id) + '.png'
        },
        description: function(){
            if (this.player_info.user_id == -1)
                return "";
            if (this.description_type == "winning_rate")
                return "胜率:" + (this.player_info.user_data.user_info.rate_of_victory * 100).toFixed(2) + "%"
            else if (this.description_type == "battle_state")
                return this.player_info.is_hosting? "托管中" : "在线"
        }
    }
});

Vue.component("playerinfo-list", {
    props: ['players_info'],
    template:`
        <div class='ui big list'>
            <playerinfo-item v-for="(player_info, index) in players_info" :key="index"
                :item_id="index"
                :player_id="-1"
                :player_info="player_info"
                description_type="winning_rate">

            </playerinfo-item>
        </div>`
});

Vue.component("battle-info", {
    props: ['battle_info', 'board_info'],
    template:`
        <div class="ui fluid card">
            <div class="ui image">
                <img src="static/common/images/standard.png">
            </div>
            <div class="content">
                <div class="header">{{battle_type}}</div>
                <div class="meta">
                    <span class="date">{{start_state}}</span>
                </div>
                <div class="description">
                    对局进程: {{(board_info.board_progress * 100).toFixed(2)}}%
                </div>
            </div>
            <div class="extra content">
                <div class="header">对局信息</div>
                限时: {{ accuracy_time }}<br>
                每步额外限时: {{ additional_time }}<br>
                预计剩余时间: {{ remaining_time }}
            </div>
        </div>`,
    methods:{
        format_time: function (second) {
            let minute = Math.floor( second / 60 );
            if (minute < 60)
                return minute + "分钟";
            let hour = Math.floor(second / 60);
            if (hour < 24)
                return hour + "小时";
            let day = Math.floor(hour / 24);
            return day + "天";
        }
    },
    computed: {
        battle_type: function () {
            var battletype_translate = {
                standard: "四人对局"
            };
            return battletype_translate[this.board_info.board_type]
        },
        start_state : function () {
            if (! this.battle_info.started)
                return "未开始";
            else
                return "开始于" + this.format_time(
                    (Math.floor(new Date().valueOf() / 1000) - this.battle_info.start_time )) + "前"
        },
        accuracy_time: function () {
            return this.battle_info.accuracy_time + "s"
        },
        additional_time: function () {
            return this.battle_info.additional_time + "s"
        },
        remaining_time: function () {
            return "暂未实现"
        }
    }
});

Vue.component("battle-item", {
    props: ['battle_data'],
    template:`
        <div class="item" v-on:click="goto_battle">
            <div class="ui image" name="head">
                <img class="ui avatar image" src="static/favicon.ico">
            </div>
            <div class="content">
                <div class="ui header" name="content"> {{battle_data.battle_info.battle_name}} </div>
                <div class="ui popup">
                    <battle-info :battle_info="battle_data.battle_info" :board_info="battle_data.board_info">
                    </battle-info>
                </div>
            </div>
            <div class="ui popup">
                <div class='header'>用户信息</div>
                <playerinfo-list :players_info="battle_data.players_info"></playerinfo-list>
            </div>
        </div>`,
    methods: {
        goto_battle: function(){
            window.open("/battle?battle_id=" + this.battle_data.battle_id)
        }
    }
});

Vue.component("battle-list", {
    props: ['battles_data'],
    template: `
        <div class="ui huge divided selection list">
            <battle-item v-for="(battle_data, index) in battles_data"  :key="index"
                :battle_data="battle_data">
            </battle-item>
        </div>`,
    updated: function(){
        $('[name="head"]').popup({inline:true});
        $('[name="content"]').popup({inline: true});
    }
});

Vue.component("playerinfo-table",{
    props: ['players_info', 'player_id'],
    template: `
    <div class="ui vertical segment">
        <div class="left aligned attached ui two item menu">
            <playerinfo-item :player_info="players_info[0]" :item_id="0" :player_id="player_id" description_type="battle_state"></playerinfo-item>
            <playerinfo-item :player_info="players_info[3]" :item_id="3" :player_id="player_id" description_type="battle_state"></playerinfo-item>
        </div>
        <div class="left aligned attached ui two item menu">
            <playerinfo-item :player_info="players_info[1]" :item_id="1" :player_id="player_id" description_type="battle_state"></playerinfo-item>
            <playerinfo-item :player_info="players_info[2]" :item_id="2" :player_id="player_id" description_type="battle_state"></playerinfo-item>
        </div>
    </div>`
});

Vue.component("chat-box", {
    props: ['chat_logs'],
    template: `
        <div class="ui segment">
            <div class="ui horizontal chat-box">
                <p v-for="chat_log in chat_logs"> {{chat_log}}</p>
            </div>
            <div class="ui divider"></div>
            <div class="ui fluid action input">
                <input type="text">
                <button class="ui teal button">发送</button>
            </div>
        </div>`
});

Vue.component("control-panel", {
    props: ['battle_data', 'player_id'],
    template: `
        <div class="ui four wide column">
            <chat-box :chat_logs="battle_data.chat_logs"></chat-box>
            <div class="ui teal fluid button" 
                :class="{disabled: !can_hosting, loading: loading, active: hosting}"
                @mousedown="update_hosting"
                id="hosting_button">
                {{ hosting ? "取消托管": "托管"}}
            </div>
            <playerinfo-table 
                :player_id="player_id"
                :players_info="battle_data.players_info">
            </playerinfo-table>
            <div class="ui fluid negative button" @click="leave">离开</div>
        </div> `,
    data: function(){
        return {
            loading: false
        }
    },
    methods: {
        update_hosting: function(){
            this.loading = true
            control_panel = this
            target_url = "/api/battles/" + this.battle_data.battle_id + "/players/" + this.player_id + "/hosting"
            $.ajax({
                type: control_panel.hosting? "DELETE": "POST",
                url: target_url,
                success: function(data){
                    control_panel.loading = false
                    if (data.message == "success"){
                        battle_inferface.battle_data = data.result
                    }
                    else{
                        show_message(data.message)
                    }
                },
                error: function(data){
                    control_panel.loading = false
                    show_message("请求失败，请检查网络连接")
                }
            })
        },
        leave: function(){
            if (this.player_id !== -1)
                try_leave(this.player_id, window.close)
            else
                window.close()
        }
    },
    computed: {
        can_hosting: function () {
            return !this.battle_data.battle_info.ended && 
                    !this.loading && 
                    this.player_id != -1
        },
        can_leave: function(){
            return this.player_id != -1
        },
        hosting: function(){
            if (this.player_id == -1) 
                return false
            return this.battle_data.players_info[this.player_id]['is_hosting']
        }
    }
});

Vue.component("battle-progress", {
    props: ['running', 'board_progress'],
    template: `
        <div class="ui small progress"
            :class="{disabled: !running, gray: !running, teal: running}"
            :data-percent="board_progress" id="battle_progress">
            <div class="bar">
                <div class="progress"></div>
            </div>
        </div>`,
    watch: {
        "board_progress": function(){
            $("#battle_progress").progress("set percent", this.board_progress)
        }
    }
})

Vue.component("battle-interface", {
    props: ['board_data', 'battle_data', 'user_info'],
    template: `
        <div class="ui grid container stackable">
            <div class="ui center aligned eleven wide column">
                <div class="ui segment">
                    <canvas id="board" height="642px" width="700px"></canvas>
                </div>
                <battle-progress
                    :running="running"
                    :board_progress="board_progress">
                </battle-progress>
            </div>
            <control-panel :battle_data="battle_data" :player_id="player_id"> </control-panel>
        </div>`,
    mounted: function(){
        this.board = generateBoard($("#board")[0], this.player_id, this.board_data, ColorThemeFactory("default"));
    },
    updated: function(){
        $('.chat-box').scrollTop(
            $('.chat-box')[0].scrollHeight
        );
    },
    watch: {
        'battle_data.board_info': function(){
            this.board.loadState(this.battle_data)
        },
        'player_id': function(){
            this.board.update_player(this.player_id)
        }
    },
    computed: {
        running: function () {
            return this.battle_data.battle_info.started &&
                    !this.battle_data.battle_info.ended
        },
        board_progress: function(){
            return 100 * this.battle_data.board_info.board_progress
        },
        player_id: function(){
            if (this.user_info.user_id === -1)
                return -1
            for (var id = 0; id < this.battle_data.players_info.length; id++)
                if (this.user_info.user_id === this.battle_data.players_info[id].user_id)
                    return id
            return -1
        }
    }
});

Vue.component("timer-scheme-selector", {
    props: ['timer_scheme', 'timer'],
    template: `
        <div class="ui vertical segment">
            <div class="field" name="timing_plan">
                <label>计时类型</label>
                <select v-model="timer.identity" class="ui basic inline dropdown" id="timer_type_selector">
                    <option v-for="scheme in timer_scheme" 
                        :value="scheme.identity">
                        {{scheme.name}}
                    </option>
                    <option value="custom">自定义</option>
                </select>
            </div>
            <div class="two fields">
                <div class="field">
                    <label>计时</label>
                    <div class="ui right labeled input">
                        <input v-model.number="timer.accuracy_time" type="text" name="accuracy_time">
                        <a class="ui basic label">秒</a>
                    </div>
                </div>
                <div class="field">
                    <label>额外</label>
                    <div class="ui right labeled input">
                        <input v-model.number="timer.additional_time" type="text" name="additional_time">
                        <a class="ui basic label">秒/步</a>
                    </div>
                </div>
            </div>
            <h4>预计游戏时间: {{expect_time}}</h4>
        </div> `,
    mounted: function(){
        this.update_timer_identity()
    },
    methods: {
        update_timer_identity: function(){
            for (var id = 0; id < this.timer_scheme.length; id++){
                if(this.timer_scheme[id].additional_time === this.timer.additional_time
                    && this.timer_scheme[id].accuracy_time === this.timer.accuracy_time){
                    this.timer.identity = this.timer_scheme[id].identity
                    $('#timer_type_selector').dropdown("set selected", this.timer_scheme[id].identity)
                    return
                }
            }
            this.timer.identity = "custom"
            $('#timer_type_selector').dropdown("set selected", 'custom')
        }
    },
    watch: {
        "timer.identity": function(){
            if(this.timer.identity === "custom")
                return true
            for (var id = 0; id < this.timer_scheme.length; id++){
                if(this.timer_scheme[id].identity == this.timer.identity){
                    this.timer.accuracy_time = this.timer_scheme[id].accuracy_time
                    this.timer.additional_time = this.timer_scheme[id].additional_time
                    return true
                }
            }
            console.log("ERROR! unknow identity " + this.timer.identity)
        },
        "timer.accuracy_time": function(){
            this.update_timer_identity()
        },
        "timer.additional_time": function(){
            this.update_timer_identity()
        }
    },
    computed: {
        expect_time: function(){
            second = (this.timer.accuracy_time + this.timer.additional_time * 21) * 4
            var minute = Math.floor( second / 60 );
            if (minute < 60)
                return minute + "分钟";
            var hour = Math.floor(second / 60);
            if (hour < 24)
                return hour + "小时";
            var day = Math.floor(hour / 24);
            return day + "天";
        }
    }
});