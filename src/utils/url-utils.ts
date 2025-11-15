import { PlatformType } from '../types/social-media';

/**
 * Extrae URLs de un texto y elimina duplicados
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex) || [];

  // Deduplicate URLs - only return unique URLs
  const uniqueUrls = [...new Set(urls)];

  // Log if duplicates were removed
  if (urls.length !== uniqueUrls.length) {
    console.log(`🔄 Removed ${urls.length - uniqueUrls.length} duplicate URL(s) from message`);
  }

  return uniqueUrls;
}

/**
 * Detecta la plataforma de una URL
 */
export function detectPlatform(url: string): PlatformType | null {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();

  // Fix: Use proper domain matching instead of substring matching
  if (hostname === 'twitter.com' || hostname === 'www.twitter.com' || 
      hostname === 'x.com' || hostname === 'www.x.com' || 
      hostname === 't.co' || hostname === 'www.t.co') {
    return 'twitter';
  }

  if (hostname === 'instagram.com' || hostname === 'www.instagram.com' || 
      hostname === 'instagr.am' || hostname === 'www.instagr.am') {
    return 'instagram';
  }

  if (hostname === 'tiktok.com' || hostname === 'www.tiktok.com' || 
      hostname === 'vm.tiktok.com' || hostname === 'vt.tiktok.com') {
    return 'tiktok';
  }

  return null;
}

/**
 * Mapeo manual para extractores que no pueden ser derivados automáticamente
 * Basado en la lista oficial de yt-dlp en supportedsites.md
 */
const EXTRACTOR_TO_DOMAIN_MAP: Record<string, string[]> = {
  // Casos especiales donde el nombre del extractor no coincide con el dominio
  'abcnews': ['abcnews.go.com'],
  'aol.com': ['aol.com'],
  'archive.org': ['archive.org'],
  'arte.sky.it': ['arte.sky.it'],
  'bbc': ['bbc.co.uk', 'bbc.com'],
  'cbc.ca': ['cbc.ca'],
  'cbsnews': ['cbsnews.com'],
  'cnn': ['cnn.com'],
  'dailymotion': ['dailymotion.com', 'dai.ly'],
  'facebook': ['facebook.com', 'fb.watch', 'm.facebook.com'],
  'generic': [], // Extractor genérico, no necesita dominio específico
  'google:podcasts': ['podcasts.google.com'],
  'imdb': ['imdb.com'],
  'instagram': ['instagram.com', 'instagr.am'],
  'kick:clips': ['kick.com'],
  'kick:live': ['kick.com'],
  'kick:vod': ['kick.com'],
  'lbry': ['odysee.com', 'lbry.tv'],
  'linkedin': ['linkedin.com'],
  'nbc': ['nbc.com'],
  'reddit': ['reddit.com', 'v.redd.it', 'i.redd.it', 'old.reddit.com'],
  'soundcloud': ['soundcloud.com', 'snd.sc'],
  'tiktok': ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'],
  'twitter': ['twitter.com', 'x.com', 't.co', 'mobile.twitter.com'],
  'vimeo': ['vimeo.com', 'player.vimeo.com'],
  'vk': ['vk.com', 'vkontakte.ru'],
  'youtube': ['youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com'],
  // Continuar agregando mapeos según sea necesario...
};

/**
 * Lista de extractores oficiales de yt-dlp (extraídos de supportedsites.md)
 * Esta es la fuente de verdad para sitios soportados
 */
const YT_DLP_EXTRACTORS = [
  '10play', '17live', '1News', '1tv', '20min', '23video', '247sports', '24tv.ua',
  '3qsdn', '3sat', '4tube', '56.com', '6play', '7plus', '8tracks', '9c9media',
  '9gag', '9News', '9now.com.au', 'abc.net.au', 'abcnews', 'abcotvs', 'AbemaTV',
  'AcademicEarth:Course', 'acast', 'AcFunBangumi', 'AcFunVideo', 'ADN', 'AdobeConnect',
  'adobetv', 'AdultSwim', 'aenetworks', 'AeonCo', 'AirTV', 'AitubeKZVideo',
  'AliExpressLive', 'AlJazeera', 'Allocine', 'Allstar', 'AlphaPorno', 'Alsace20TV',
  'altcensored', 'Alura', 'AmadeusTV', 'Amara', 'AmazonMiniTV', 'AmazonReviews',
  'AmazonStore', 'AMCNetworks', 'AmericasTestKitchen', 'AmHistoryChannel',
  'AnchorFMEpisode', 'anderetijden', 'Angel', 'AnimalPlanet', 'ant1newsgr:article',
  'antenna:watch', 'Anvato', 'aol.com', 'APA', 'Aparat', 'AppleConnect', 'AppleDaily',
  'ApplePodcasts', 'appletrailers', 'archive.org', 'ArcPublishing', 'ARD',
  'ARDMediathek', 'Arkena', 'Art19', 'arte.sky.it', 'ArteTV', 'asobichannel',
  'AsobiStage', 'AtresPlayer', 'AtScaleConfEvent', 'ATVAt', 'AudiMedia', 'AudioBoom',
  'Audiodraft:custom', 'audiomack', 'Audius', 'AWAAN', 'axs.tv', 'AZMedien',
  'BaiduVideo', 'BanBye', 'Bandcamp', 'Bandlab', 'BannedVideo', 'bbc', 'BeaconTv',
  'BeatBumpPlaylist', 'Beatport', 'Beeg', 'BehindKink', 'Bellator', 'BerufeTV',
  'Bet', 'bfi:player', 'bfmtv', 'bibeltv:live', 'Bigflix', 'Bigo', 'Bild',
  'BiliBili', 'BilibiliAudio', 'BiliBiliBangumi', 'BilibiliCheese', 'BilibiliCollectionList',
  'BiliBiliDynamic', 'BilibiliFavoritesList', 'BiliBiliPlayer', 'BilibiliPlaylist',
  'BiliBiliSearch', 'BilibiliSeriesList', 'BilibiliSpaceAudio', 'BilibiliSpaceVideo',
  'BilibiliWatchlater', 'BiliIntl', 'BiliLive', 'BioBioChileTV', 'Biography',
  'BitChute', 'BlackboardCollaborate', 'BleacherReport', 'blerp', 'blogger.com',
  'Bloomberg', 'Bluesky', 'BokeCC', 'BongaCams', 'Boosty', 'BostonGlobe', 'Box',
  'BoxCastVideo', 'Bpb', 'BR', 'BrainPOP', 'BravoTV', 'BreitBart', 'brightcove:legacy',
  'brightcove:new', 'Brilliantpala:Classes', 'bt:article', 'BTVPlus', 'Bundesliga',
  'Bundestag', 'BunnyCdn', 'BusinessInsider', 'BuzzFeed', 'BYUtv', 'CaffeineTV',
  'Callin', 'Caltrans', 'CAM4', 'Camdemy', 'CamFMEpisode', 'CamModels', 'Camsoda',
  'CamtasiaEmbed', 'Canal1', 'CanalAlpha', 'canalc2.tv', 'Canalplus', 'Canalsurmas',
  'CaracolTvPlay', 'cbc.ca', 'CBS', 'CBSLocal', 'cbsnews', 'cbssports', 'CCMA',
  'CCTV', 'CDA', 'Cellebrite', 'CeskaTelevize', 'CGTN', 'CharlieRose', 'Chaturbate',
  'Chilloutzone', 'chzzk:live', 'cielotv.it', 'Cinemax', 'CinetecaMilano',
  'Cineverse', 'CiscoLiveSearch', 'ciscowebex', 'CJSW', 'Clipchamp', 'Clippit',
  'ClipRs', 'ClipYouEmbed', 'CloserToTruth', 'CloudflareStream', 'CloudyCDN',
  'Clubic', 'Clyp', 'cmt.com', 'CNBCVideo', 'CNN', 'CNNIndonesia', 'ComedyCentral',
  'ConanClassic', 'CondeNast', 'CONtv', 'CookingChannel', 'Corus', 'Coub', 'CozyTV',
  'cp24', 'cpac', 'Cracked', 'Crackle', 'Craftsy', 'CrooksAndLiars', 'CrowdBunker',
  'Crtvg', 'CSpan', 'CtsNews', 'CTVNews', 'cu.ntv.co.jp', 'CultureUnplugged',
  'curiositystream', 'cwtv', 'Cybrary', 'DacastPlaylist', 'DagelijkseKost',
  'DailyMail', 'dailymotion', 'DailyWire', 'damtomo:record', 'dangalplay',
  'daum.net', 'daystar:clip', 'DBTV', 'DctpTv', 'democracynow', 'DestinationAmerica',
  'DetikEmbed', 'DeuxM', 'DHM', 'DigitalConcertHall', 'DigitallySpeaking',
  'Digiteka', 'Digiview', 'DiscogsReleasePlaylist', 'DiscoveryLife',
  'DiscoveryNetworksDe', 'DiscoveryPlus', 'DiscoveryPlusIndia', 'DiscoveryPlusItaly',
  'Disney', 'dlf', 'dlive:stream', 'Douyin', 'DouyuShow', 'DouyuTV', 'DPlay',
  'DRBonanza', 'Drooble', 'Dropbox', 'Dropout', 'DrTalks', 'DrTuber', 'drtv',
  'DTube', 'duboku', 'Dumpert', 'Duoplay', 'dvtv', 'dw', 'dzen.ru', 'EaglePlatform',
  'EbaumsWorld', 'Ebay', 'egghead:course', 'eggs:artist', 'EinsUndEinsTV',
  'eitb.tv', 'ElementorEmbed', 'Elonet', 'ElPais', 'ElTreceTV', 'Embedly', 'EMPFlix',
  'Epicon', 'EpidemicSound', 'eplus', 'Epoch', 'Eporner', 'Erocast', 'EroProfile',
  'ERRJupiter', 'ertflix', 'ESPN', 'EttuTv', 'Europa', 'EuroParlWebstream',
  'EuropeanTour', 'Eurosport', 'EUScreen', 'EWETV', 'Expressen', 'EyedoTV',
  'facebook', 'Fathom', 'faz.net', 'fc2', 'Fczenit', 'Fifa', 'filmon', 'Filmweb',
  'FiveThirtyEight', 'FiveTV', 'FlexTV', 'Flickr', 'Floatplane', 'Folketinget',
  'FoodNetwork', 'FootyRoom', 'Formula1', 'FOX', 'FOX9', 'foxnews', 'FoxSports',
  'fptplay', 'FrancaisFacile', 'FranceCulture', 'FranceInter', 'francetv',
  'Freesound', 'freespeech.org', 'freetv:series', 'FreeTvMovies', 'FrontendMasters',
  'FujiTVFODPlus7', 'Funk', 'Funker530', 'Fux', 'FuyinTV', 'Gab', 'GabTV', 'Gaia',
  'GameDevTVDashboard', 'GameJolt', 'GameSpot', 'GameStar', 'Gaskrank', 'Gazeta',
  'GBNews', 'GDCVault', 'GediDigital', 'gem.cbc.ca', 'Genius', 'Germanupa',
  'GetCourseRu', 'Gettr', 'GiantBomb', 'GlattvisionTV', 'Glide', 'GlobalPlayerAudio',
  'Globo', 'glomex', 'GMANetworkVideo', 'Go', 'GoDiscovery', 'GodResource',
  'GodTube', 'Gofile', 'Golem', 'goodgame:stream', 'google:podcasts', 'GoogleDrive',
  'GoPlay', 'GoPro', 'Goshgay', 'GoToStage', 'GPUTechConf', 'Graspop', 'Gronkh',
  'Groupon', 'Harpodeon', 'hbo', 'HearThisAt', 'Heise', 'HellPorno', 'hetklokhuis',
  'hgtv.com:show', 'HGTVDe', 'HGTVUsa', 'HiDive', 'HistoricFilms', 'history:player',
  'HitRecord', 'hketv', 'HollywoodReporter', 'Holodex', 'HotNewHipHop', 'hotstar',
  'hrfernsehen', 'HRTi', 'HSEProduct', 'html5', 'Huajiao', 'HuffPost', 'Hungama',
  'huya:live', 'Hypem', 'Hytale', 'Icareus', 'IdolPlus', 'iflix:episode', 'ign.com',
  'iheartradio', 'IlPost', 'Iltalehti', 'imdb', 'Imgur', 'Ina', 'Inc', 'IndavideoEmbed',
  'InfoQ', 'Instagram', 'Internazionale', 'InternetVideoArchive', 'InvestigationDiscovery',
  'IPrima', 'iq.com', 'iqiyi', 'IslamChannel', 'IsraelNationalNews', 'ITProTV',
  'ITV', 'ivi', 'ivideon', 'Ivoox', 'IVXPlayer', 'iwara', 'Ixigua', 'Izlesene',
  'Jamendo', 'JeuxVideo', 'jiosaavn:album', 'Joj', 'Jove', 'JStream', 'JTBC',
  'JWPlatform', 'Kakao', 'Kaltura', 'KankaNews', 'Karaoketv', 'Katsomo', 'KelbyOne',
  'Kenh14Playlist', 'khanacademy', 'kick:clips', 'kick:live', 'kick:vod', 'Kicker',
  'KickStarter', 'Kika', 'kinja:embed', 'KinoPoisk', 'Kommunetv', 'KompasVideo',
  'Koo', 'KrasView', 'KTH', 'Ku6', 'KukuluLive', 'kuwo:album', 'la7.it', 'laracasts',
  'LastFM', 'LaXarxaMes', 'lbry', 'LCI', 'Lcp', 'Le', 'LearningOnScreen', 'Lecture2Go',
  'Lecturio', 'LeFigaroVideoEmbed', 'LEGO', 'Lemonde', 'Lenta', 'LePlaylist',
  'LetvCloud', 'Libsyn', 'life', 'likee', 'LinkedIn', 'Liputan6', 'ListenNotes',
  'LiTV', 'LiveJournal', 'livestream', 'Livestreamfails', 'Lnk', 'loc', 'Loco',
  'loom', 'LoveHomePorn', 'LRTRadio', 'LSMLREmbed', 'Lumni', 'lynda', 'maariv.co.il',
  'MagellanTV', 'MagentaMusik', 'mailru', 'MainStreaming', 'mangomolo:live',
  'MangoTV', 'ManotoTV', 'ManyVids', 'MaoriTV', 'Markiza', 'massengeschmack.tv',
  'Masters', 'MatchTV', 'Mave', 'MBN', 'MDR', 'MedalTV', 'media.ccc.de', 'Mediaite',
  'MediaKlikk', 'Medialaan', 'Mediaset', 'Mediasite', 'MediaStream', 'MediaWorksNZVOD',
  'Medici', 'megaphone.fm', 'megatvcom', 'Meipai', 'MelonVOD', 'Metacritic',
  'mewatch', 'MicrosoftBuild', 'MicrosoftEmbed', 'MicrosoftLearnEpisode',
  'MicrosoftMedius', 'microsoftstream', 'minds', 'Minoto', 'mir24.tv', 'mirrativ',
  'MirrorCoUK', 'MiTele', 'mixch', 'mixcloud', 'Mixlr', 'MLB', 'MLSSoccer',
  'MNetTV', 'MochaVideo', 'Mojevideo', 'Mojvideo', 'Monstercat', 'monstersiren',
  'Motherless', 'Motorsport', 'MovieFap', 'moviepilot', 'MoviewPlay', 'Moviezine',
  'MovingImage', 'MSN', 'mtg', 'mtv', 'MTVUutisetArticle', 'MuenchenTV', 'MujRozhlas',
  'Murrtube', 'MuseAI', 'MuseScore', 'MusicdexAlbum', 'Mx3', 'Mxplayer', 'MySpace',
  'MySpass', 'MyVideoGe', 'MyVidster', 'Mzaalo', 'n-tv.de', 'N1Info:article',
  'Nate', 'natgeo:video', 'NationalGeographicTV', 'Naver', 'navernow', 'nba',
  'NBC', 'NBCNews', 'nbcolympics', 'NBCSports', 'NBCStations', 'ndr', 'NDTV',
  'nebula:channel', 'NekoHacker', 'NerdCubedFeed', 'Nest', 'netease:album',
  'NetPlusTV', 'Netverse', 'Netzkino', 'Newgrounds', 'NewsPicks', 'Newsy',
  'NextMedia', 'NextTV', 'Nexx', 'nfb', 'NFHSNetwork', 'nfl.com', 'NhkForSchoolBangumi',
  'NhkRadioNewsPage', 'NhkRadiru', 'NhkVod', 'nhl.com', 'nick.com', 'nickelodeon:br',
  'nickelodeonru', 'niconico', 'NiconicoChannelPlus', 'NiconicoUser', 'nicovideo:search',
  'NinaProtocol', 'Nintendo', 'Nitter', 'njoy', 'NobelPrize', 'NoicePodcast',
  'NonkTube', 'NoodleMagazine', 'NOSNLArticle', 'Nova', 'nowness', 'Noz', 'npo',
  'Npr', 'NRK', 'NRLTV', 'nts.live', 'ntv.ru', 'NubilesPorn', 'nuum:live',
  'Nuvid', 'NYTimes', 'nzherald', 'NZOnScreen', 'NZZ', 'ocw.mit.edu', 'Odnoklassniki',
  'OfTV', 'OktoberfestTV', 'OlympicsReplay', 'on24', 'OnDemandChinaEpisode',
  'OnDemandKorea', 'OneFootball', 'OnePlacePodcast', 'onet.pl', 'OnionStudios',
  'Opencast', 'openrec', 'OraTV', 'orf:fm4:story', 'OsnatelTV', 'OutsideTV',
  'OwnCloud', 'PacktPub', 'PalcoMP3:artist', 'Panopto', 'ParamountNetwork',
  'ParamountPlus', 'Parler', 'parliamentlive.tv', 'Parlview', 'parti:livestream',
  'patreon', 'pbs', 'PBSKids', 'PearVideo', 'PeekVids', 'peer.tv', 'PeerTube',
  'peloton', 'PerformGroup', 'periscope', 'PGATour', 'PhilharmonieDeParis',
  'phoenix.de', 'Photobucket', 'PiaLive', 'Piapro', 'picarto', 'Piksel', 'Pinkbike',
  'Pinterest', 'PiramideTV', 'pixiv:sketch', 'Pladform', 'PlanetMarathi', 'Platzi',
  'player.sky.it', 'PlayerFm', 'playeur', 'PlayPlusTV', 'PlaySuisse', 'Playtvak',
  'PlayVids', 'Playwire', 'pluralsight', 'PlutoTV', 'PlVideo', 'PodbayFM',
  'Podchaser', 'podomatic', 'PokerGo', 'PolsatGo', 'PolskieRadio', 'Popcorntimes',
  'PopcornTV', 'Pornbox', 'PornerBros', 'PornFlip', 'PornHub', 'Pornotube',
  'PornoVoisines', 'PornoXO', 'PornTop', 'PornTube', 'Pr0gramm', 'PrankCast',
  'PremiershipRugby', 'PressTV', 'ProjectVeritas', 'prosiebensat1', 'PRXAccount',
  'puhutv', 'Puls4', 'Pyvideo', 'QDance', 'QingTing', 'qqmusic', 'QuantumTV',
  'R7', 'Radiko', 'radio.de', 'Radio1Be', 'radiocanada', 'RadioComercial',
  'radiofrance', 'RadioJavan', 'radiokapital', 'RadioRadicale', 'RadioZetPodcast',
  'radlive', 'Rai', 'RayWenderlich', 'RbgTum', 'RCS', 'RCTIPlus', 'RDS', 'RedBull',
  'redcdnlivx', 'Reddit', 'RedGifs', 'RedTube', 'RENTV', 'Restudy', 'Reuters',
  'ReverbNation', 'RheinMainTV', 'RideHome', 'RinseFM', 'RMCDecouverte',
  'RockstarGames', 'Rokfin', 'RoosterTeeth', 'RottenTomatoes', 'RoyaLive',
  'Rozhlas', 'RTBF', 'RTDocumentry', 'rte', 'rtl.lu:article', 'rtl.nl', 'rtl2',
  'RTLLuLive', 'RTNews', 'RTP', 'RTRFM', 'RTS', 'RTVCKaltura', 'rtve.es:alacarta',
  'rtvslo.si', 'RudoVideo', 'Rule34Video', 'Rumble', 'Ruptly', 'rutube', 'RUTV',
  'Ruutu', 'Ruv', 'S4C', 'safari', 'Saitosan', 'SAKTV', 'SaltTV', 'SampleFocus',
  'Sangiin', 'Sapo', 'SaucePlus', 'SBS', 'schooltv', 'ScienceChannel',
  'screen.yahoo:search', 'Screen9', 'Screencast', 'Screencastify', 'ScreencastOMatic',
  'ScreenRec', 'ScrippsNetworks', 'Scrolller', 'SCTE', 'sejm', 'Sen',
  'SenalColombiaLive', 'senate.gov', 'SendtoNews', 'Servus', 'Sexu', 'SeznamZpravy',
  'Shahid', 'SharePoint', 'ShareVideosEmbed', 'ShemarooMe', 'ShowRoomLive',
  'ShugiinItvLive', 'SibnetEmbed', 'simplecast', 'Sina', 'Skeb', 'sky.it',
  'SkylineWebcams', 'skynewsarabia:article', 'SkyNewsAU', 'Slideshare', 'SlidesLive',
  'Slutload', 'Smotrim', 'SnapchatSpotlight', 'Snotr', 'SoftWhiteUnderbelly',
  'Sohu', 'SonyLIV', 'soop', 'soundcloud', 'SoundcloudEmbed', 'soundgasm',
  'southpark.cc.com', 'SovietsCloset', 'SpankBang', 'Spiegel', 'Sport5', 'SportBox',
  'SportDeutschland', 'spotify', 'Spreaker', 'SpringboardPlatform', 'SproutVideo',
  'sr:mediathek', 'SRGSSR', 'StacommuLive', 'StagePlusVODConcert', 'stanfordoc',
  'startrek', 'startv', 'Steam', 'Stitcher', 'StoryFire', 'Streaks', 'Streamable',
  'StreamCZ', 'StreetVoice', 'StretchInternet', 'Stripchat', 'stv:player', 'stvr',
  'Subsplash', 'Substack', 'SunPorno', 'sverigesradio:episode', 'svt:page',
  'SwearnetEpisode', 'Syfy', 'SYVDK', 'SztvHu', 't-online.de', 'Tagesschau',
  'TapTapApp', 'Tass', 'TBS', 'Teachable', 'teachertube', 'TeachingChannel',
  'Teamcoco', 'TeamTreeHouse', 'techtv.mit.edu', 'TedEmbed', 'Tele13', 'Tele5',
  'TeleBruxelles', 'TelecaribePlay', 'Telecinco', 'Telegraaf', 'telegram:embed',
  'TeleMB', 'Telemundo', 'TeleQuebec', 'TeleTask', 'Telewebion', 'Tempo',
  'TennisTV', 'TF1', 'TFO', 'theatercomplextown:ppv', 'TheGuardianPodcast',
  'TheHighWire', 'TheHoleTv', 'TheIntercept', 'ThePlatform', 'TheStar', 'TheSun',
  'TheWeatherChannel', 'ThisAmericanLife', 'ThisOldHouse', 'ThisVid', 'ThreeSpeak',
  'TikTok', 'TLC', 'TMZ', 'TNAFlix', 'toggle', 'toggo', 'tokfm:audition',
  'ToonGoggles', 'tou.tv', 'toutiao', 'Toypics', 'TrailerAddict', 'TravelChannel',
  'Triller', 'Trovo', 'TrtCocukVideo', 'TrueID', 'TruNews', 'Truth', 'TruTV',
  'Tube8', 'TubeTuGraz', 'tubitv', 'Tumblr', 'TuneInPodcast', 'tv.dfb.de', 'TV2',
  'TV4', 'TV5MONDE', 'tv5unis', 'tv8.it', 'TVANouvelles', 'tvaplus', 'TVC',
  'TVer', 'tvigle', 'TVIPlayer', 'tvland.com', 'TVN24', 'TVNoe', 'tvopengr:embed',
  'tvp', 'TVPlayer', 'TVPlayHome', 'tvw', 'Tweakers', 'TwitCasting', 'twitch:clips',
  'twitter', 'Txxx', 'udemy', 'UDNEmbed', 'UFCArabia', 'UFCTV', 'ukcolumn',
  'UKTVPlay', 'UlizaPlayer', 'umg:de', 'Unistra', 'UnitedNationsWebTv', 'Unity',
  'uol.com.br', 'uplynk', 'Urort', 'URPlay', 'USANetwork', 'USAToday', 'ustream',
  'ustudio', 'Varzesh3', 'Vbox7', 'Veo', 'Vesti', 'Vevo', 'VGTV', 'vh1.com',
  'vhx:embed', 'vice', 'Viddler', 'Videa', 'video.arnes.si', 'video.google:search',
  'video.sky.it', 'VideoDetective', 'videofy.me', 'VideoKen', 'videomore',
  'VideoPress', 'Vidflex', 'Vidio', 'VidLii', 'Vidly', 'vids.io', 'Vidyard',
  'viewlift', 'Viidea', 'vimeo', 'Vimm:recording', 'ViMP', 'Viously', 'Viqeo',
  'Viu', 'ViuOTTIndonesia', 'vk', 'VKPlay', 'vm.tiktok', 'Vocaroo', 'VODPl',
  'voicy', 'VolejTV', 'VoxMedia', 'vpro', 'vqq:series', 'vrsquare', 'VRT',
  'vrtmax', 'VTM', 'VTV', 'VTXTV', 'VuClip', 'VVVVID', 'Walla', 'WalyTV',
  'washingtonpost', 'wat.tv', 'WatchESPN', 'WDR', 'Webcamerapl', 'Webcaster',
  'WebOfStories', 'Weibo', 'WeiqiTV', 'wetv:episode', 'Weverse', 'WeVidi',
  'Weyyak', 'whowatch', 'Whyp', 'wikimedia.org', 'Wimbledon', 'WimTV',
  'WinSportsVideo', 'Wistia', 'wnl', 'wordpress:mb.miniAudioPlayer', 'WorldStarHipHop',
  'wppilot', 'WrestleUniversePPV', 'WSJ', 'WWE', 'wyborcza:video', 'wykop:dig',
  'Xanimu', 'XboxClips', 'XHamster', 'XiaoHongShu', 'ximalaya', 'Xinpianchang',
  'XMinus', 'XNXX', 'Xstream', 'XVideos', 'XXXYMovies', 'Yahoo', 'YandexDisk',
  'yandexmusic:album', 'YandexVideo', 'YapFiles', 'Yappy', 'YleAreena', 'YouJizz',
  'youku', 'YouNowChannel', 'YouPorn', 'youtube', 'YoutubeLivestreamEmbed',
  'YoutubeYtBe', 'Zaiko', 'Zapiks', 'Zattoo', 'zdf', 'Zee5', 'ZeeNews', 'ZenPorn',
  'ZetlandDKArticle', 'Zhihu', 'zingmp3', 'zoom', 'Zype', 'generic'
];

/**
 * Deriva un dominio automáticamente del nombre del extractor
 */
function deriveDomainsFromExtractor(extractor: string): string[] {
  // Remover sufijos específicos de extractores
  const cleanName = extractor
    .replace(/:.*$/, '') // Remover todo después de ':'
    .replace(/^.*?:/, '') // Remover prefijos hasta ':'
    .toLowerCase();

  // Casos especiales que necesitan mapeo manual
  if (EXTRACTOR_TO_DOMAIN_MAP[cleanName]) {
    return EXTRACTOR_TO_DOMAIN_MAP[cleanName];
  }

  // Casos especiales para derivación automática
  const specialCases: Record<string, string[]> = {
    // Dominios comunes que pueden derivarse
    'generic': [], // No agregar dominio para generic
    'brightcove': ['brightcove.com'],
    'kaltura': ['kaltura.com'],
    'jwplatform': ['jwplatform.com'],
    'embedly': ['embedly.com'],
    'cloudflarestream': ['cloudflarestream.com'],
    'wistia': ['wistia.com'],
    'vimeo': ['vimeo.com'],
    'youtube': ['youtube.com', 'youtu.be'],
    'dailymotion': ['dailymotion.com'],
    'twitch': ['twitch.tv'],
    'facebook': ['facebook.com'],
    'instagram': ['instagram.com'],
    'tiktok': ['tiktok.com'],
    'reddit': ['reddit.com'],
    'soundcloud': ['soundcloud.com'],
    'vk': ['vk.com'],
    'bilibili': ['bilibili.com'],
    'kick': ['kick.com']
  };

  if (specialCases[cleanName]) {
    return specialCases[cleanName];
  }

  // Intentar derivación automática para nombres simples
  if (cleanName.match(/^[a-z0-9]+$/)) {
    // Si es un nombre simple sin caracteres especiales, intentar .com
    return [`${cleanName}.com`];
  }

  // Si contiene puntos, asumir que ya es un dominio
  if (cleanName.includes('.')) {
    return [cleanName];
  }

  return [];
}

/**
 * Obtiene todos los dominios soportados por yt-dlp
 */
function getAllSupportedDomains(): string[] {
  const allDomains = new Set<string>();

  for (const extractor of YT_DLP_EXTRACTORS) {
    const domains = deriveDomainsFromExtractor(extractor);
    domains.forEach(domain => allDomains.add(domain.toLowerCase()));
  }

  return Array.from(allDomains).filter(domain => domain.length > 0);
}

/**
 * Cache de dominios soportados para mejorar rendimiento
 */
let supportedDomainsCache: string[] | null = null;

/**
 * Verifica si una URL puede ser procesada por youtube-dl/yt-dlp
 * Utiliza la lista oficial completa de extractores de yt-dlp
 */
export function isProcessableUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Inicializar cache si no existe
    if (!supportedDomainsCache) {
      supportedDomainsCache = getAllSupportedDomains();
      console.log(`🔍 Loaded ${supportedDomainsCache.length} supported domains from yt-dlp`);
    }
    
    // Verificar coincidencia exacta
    if (supportedDomainsCache.includes(domain)) {
      return true;
    }
    
    // Verificar con www.
    const domainWithoutWww = domain.replace(/^www\./, '');
    if (supportedDomainsCache.includes(domainWithoutWww)) {
      return true;
    }
    
    // Verificar si es subdominio de algún dominio soportado
    return supportedDomainsCache.some(supportedDomain => {
      // Para subdominios
      if (domain.endsWith(`.${supportedDomain}`)) {
        return true;
      }
      
      // Para casos como *.tiktok.com
      if (supportedDomain.startsWith('*.') && domain.endsWith(supportedDomain.slice(1))) {
        return true;
      }
      
      return false;
    });
  } catch {
    return false;
  }
}

/**
 * Obtiene estadísticas de sitios soportados
 */
export function getSupportedSitesStats(): {
  totalExtractors: number;
  totalDomains: number;
  domains: string[];
} {
  if (!supportedDomainsCache) {
    supportedDomainsCache = getAllSupportedDomains();
  }
  
  return {
    totalExtractors: YT_DLP_EXTRACTORS.length,
    totalDomains: supportedDomainsCache.length,
    domains: supportedDomainsCache.sort()
  };
}

/**
 * Valida si una URL es válida
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Limpia una URL removiendo parámetros innecesarios
 */
export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remover parámetros de tracking comunes
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Obtiene el dominio de una URL
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Detects if a YouTube URL is a channel URL (not downloadable content)
 */
export function isYouTubeChannel(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if it's a YouTube URL first
    if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
      return false;
    }
    
    const pathname = urlObj.pathname;
    
    // Channel URLs with @handle format
    if (pathname.match(/^\/@[^\/]+\/?$/)) {
      return true;
    }
    
    // Traditional channel URLs
    if (pathname.match(/^\/channel\/[^\/]+\/?$/)) {
      return true;
    }
    
    // User channel URLs
    if (pathname.match(/^\/user\/[^\/]+\/?$/)) {
      return true;
    }
    
    // Channel URLs ending with /videos, /playlists, /community, /about
    if (pathname.match(/^\/(c\/|channel\/|user\/|@)[^\/]+(\/videos|\/playlists|\/community|\/about|\/shorts)\/?$/)) {
      return true;
    }
    
    // Channel home pages without additional paths
    if (pathname.match(/^\/c\/[^\/]+\/?$/)) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Detects if a YouTube URL is a livestream
 */
export function isYouTubeLivestream(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if it's a YouTube URL first
    if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
      return false;
    }
    
    // Common livestream URL patterns
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;
    
    // Direct live URLs
    if (pathname.includes('/live/')) {
      return true;
    }
    
    // Stream URLs
    if (pathname.includes('/stream/')) {
      return true;
    }
    
    // Check if it's a watch URL with livestream indicators
    if (pathname === '/watch' && searchParams.has('v')) {
      // Check for common livestream parameters
      if (searchParams.has('live') || 
          searchParams.get('feature') === 'live' ||
          searchParams.get('t') === 'live') {
        return true;
      }
    }
    
    // Check for channel live URLs
    if (pathname.includes('/channel/') && pathname.includes('/live')) {
      return true;
    }
    
    // Check for user live URLs
    if (pathname.includes('/user/') && pathname.includes('/live')) {
      return true;
    }
    
    // Check for @handle live URLs
    if (pathname.includes('/@') && pathname.includes('/live')) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Verifica si una URL es de redes sociales (mantenido para compatibilidad)
 * @deprecated Use isProcessableUrl instead for comprehensive detection
 */
export function isSocialMediaUrl(url: string): boolean {
  return detectPlatform(url) !== null;
} 