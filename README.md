# Unofficial Youtube Api
Unofficial Simple Youtube Api

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
