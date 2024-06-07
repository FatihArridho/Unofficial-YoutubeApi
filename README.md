# Unofficial Youtube Api
Unofficial Simple Youtube Api

<p align="center">
<a href="https://github.com/FatihArridho?tab=followers"><img title="Followers" src="https://img.shields.io/github/followers/FatihArridho?color=red&style=flat-square"></a>
<a href="https://github.com/FatihArridho/Unofficial-YoutubeApi/stargazers/"><img title="Stars" src="https://img.shields.io/github/stars/FatihArridho/Unofficial-YoutubeApi?color=blue&style=flat-square"></a>
<a href="https://github.com/FatihArridho/Unofficial-YoutubeApi/network/members"><img title="Forks" src="https://img.shields.io/github/forks/FatihArridho/Unofficial-YoutubeApi?color=red&style=flat-square"></a>
<a href="https://github.com/FatihArridho/Unofficial-YoutubeApi/watchers"><img title="Watching" src="https://img.shields.io/github/watchers/FatihArridho/Unofficial-YoutubeApi?label=Watchers&color=blue&style=flat-square"></a>
<a href="https://github.com/FatihArridho/Unofficial-YoutubeApi"><img title="Open Source" src="https://badges.frapsoft.com/os/v2/open-source.svg?v=103"></a>
<a href="https://github.com/FatihArridho/Unofficial-YoutubeApi"><img title="Size" src="https://img.shields.io/github/repo-size/FatihArridho/Unofficial-YoutubeApi?style=flat-square&color=green"></a>
<a href="https://hits.seeyoufarm.com"><img src="https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2FFatihArridho%2FUnofficual-YoutubeApi&count_bg=%2379C83D&title_bg=%23555555&icon=probot.svg&icon_color=%2300FF6D&title=hits&edge_flat=false"/></a>
</p>

| Route           | Parameters  |
|-----------------|------------ |
| /youtube/search | all         |
| /youtube/search | channel     |
| /youtube/search | playlist    |
| /youtube/search | video       |

## Noted
<br />
ID: Router yang akan dibaca adalah rute channel, video, playlist, all
<br />
EN: What the router will read are channel routes, video, playlist, all

## Wrong Example
`/youtube/search?all=fatih&channel=fatih+arridho`
<br />
ID: Maka yang akan dibaca terlebih dahulu adalah rute channel. Begitu pula dengan yang lainnya.
<br />
EN: So what will be read first is the channel route. Likewise with the others.

## Correct Example
1. `youtube/search?channel=fatih+arridho`
2. `youtube/search?video=fatih+arridho`
3. `youtube/search?playlist=playlist+lagu+anime`
4. `youtube/search?all=fatih+arridho`

## Want To Contribute?
Pull Request! :)

## Donate
- <a href="https://saweria.co/FatihArridho" target="_blank">Saweria<a/>
- <a href="https://trakteer.id/FatihArridho/tip" target="_blank">Trakteer<a/>
