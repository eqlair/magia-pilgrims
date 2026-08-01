/**
 * 1221wildhunt イベント用コマンド生成モジュール
 */
export function build1221WildhuntCommands(party = ['001']) {
    const charNames = {
        '001': '紫苑',
        '002': '蒼樹',
        '003': '紅華',
        '004': '黄蘭',
        '005': '李乃果'
    };

    const wildhuntTexts = {
        '001': 'なんてことなの…化け物がこんなに…',
        '002': 'もう隠れられる場所なんて…',
        '003': 'こりゃもう突っ切るしかねえぞ',
        '004': 'なんて化け物の量だ、ここももう限界だ…',
        '005': 'どこも壊れてしまって…もう保ちません！'
    };

    const wildhuntReactionTexts = {
        '001': 'もうここにもいられない…突っ切る！',
        '002': '突破…できるの…？',
        '003': '行くぞ！',
        '004': '乗るしかねえなこのウェーブに！',
        '005': '行きます！'
    };

    const commands = [
        { cmd: 'image', key: 'bg_wildhunt' },
        { cmd: 'bgm', key: 'bgm_wildhunt' },
        { cmd: 'text', name: '', text: '12月21日、夜。' },
        { cmd: 'text', name: '', text: 'それは「ワイルドハント」と呼ばれる、この世の終わりそのものだった。' },
        { cmd: 'text', name: '', text: '数千、数万――いや、もはや数えることすら無意味なほどの化け物の群れが、雪に沈む廃墟を黒く染め上げていく。' },
        { cmd: 'text', name: '', text: 'それは文字通りの百鬼夜行だった。' },
        { cmd: 'text', name: '', text: '強固なビルすらも、果てしなく続く異形の蹂躙の前では枯れ木のようにへし折られ、轟音と共に粉々に砕け散っていく。地響きが足元から這い上がり、空気を震わせる咆哮が絶え間なく耳を打つ。' },
        { cmd: 'text', name: '', text: '私たちが息を潜めていたささやかな隠れ家など、その圧倒的な暴力の前では何の役にも立たなかった。' },
        { cmd: 'text', name: '', text: '迫り来る壁の崩壊と地鳴りに追われ、私たちは雪が吹きすさぶ地上へと放り出された。' },
        { cmd: 'text', name: '', text: '前後左右、見渡す限りの黒い波。' },
        { cmd: 'text', name: '', text: '逃げ場など、最初からどこにも用意されていなかったのだ。' },
        { cmd: 'text', name: '', text: '生き残るための選択肢は、狂気じみたひとつだけ。' },
        { cmd: 'text', name: '', text: 'この常軌を逸した群れのど真ん中へと突っ込み、弾薬と命を削りながら「中心突破」を図ること。' },
        { cmd: 'text', name: '', text: 'ただそれだけだった。' },
        { cmd: 'text', name: '', text: '凍りついた指で引き金に触れながら、目の前の地獄を睨みつける。' },
        { cmd: 'text', name: '', text: 'けれど、心の奥底で黒く濁った絶望が、冷たい雪のように降り積もっていくのを止められなかった。' },
        { cmd: 'text', name: '', text: '仮に。' },
        { cmd: 'text', name: '', text: '仮に、この何万という群れの中を奇跡的に抜け出せたとして。' },
        { cmd: 'text', name: '', text: 'この、すべてが壊れ、誰もいなくなった世界の果てで――。' },
        { cmd: 'text', name: '', text: '突破して、一体どこに行けばいいというのだろう？' }
    ];

    if (party && party.length > 0) {
        const firstId = party[0];
        const firstName = charNames[firstId] || '紫苑';
        const firstSpeech = wildhuntTexts[firstId] || wildhuntTexts['001'];
        commands.push({
            cmd: 'chara', key: `portrait_${firstId}`, pos: 'right'
        });
        commands.push({
            cmd: 'text', name: firstName, text: firstSpeech
        });

        // 2人目以降のメンバー（ワイルドハント反応）
        for (let i = 1; i < party.length; i++) {
            const memberId = party[i];
            const memberName = charNames[memberId] || '仲間';
            const memberSpeech = wildhuntReactionTexts[memberId] || wildhuntReactionTexts['001'];
            commands.push({
                cmd: 'chara', key: `portrait_${memberId}`, pos: 'left'
            });
            commands.push({
                cmd: 'text', name: memberName, text: memberSpeech
            });
        }

        // 先頭メンバーの最後の決意
        const firstReaction = wildhuntReactionTexts[firstId] || wildhuntReactionTexts['001'];
        if (party.length === 1) {
            commands.push({
                cmd: 'text', name: firstName, text: firstReaction
            });
        }
    }

    commands.push({ cmd: 'end' });
    return commands;
}
