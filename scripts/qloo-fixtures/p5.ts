import type { PersonaSpec } from "./spec";

/** P5 Sam, born 1965, Brooklyn, New York (young-onset). Window 1975 to 1995. Avoids 9/11 and firefighting. */
export const P5: PersonaSpec = {
  id: "p5",
  seeds: ["fx-artist-run-dmc", "fx-film-do-the-right-thing"],
  locations: ["Brooklyn", "Brooklyn, NYC", "Brooklyn, NY", "Brooklyn, New York"],
  window: { min: 1975, max: 1995 },
  fingerprint: [
    "Hip-hop", "New York stories", "Stoop life", "Sneaker culture", "Comedy", "Block party", "Pizza slice",
    "Sitcom", "Arcade games", "Rock and roll", "Disco", "Boombox", "Street style", "Baseball", "Coney Island",
    "Drama", "Blockbuster", "Mixtape", "Family", "Skyline",
  ],
  music: `
Run-DMC | Hip-hop, Sneaker culture, Block party
Beastie Boys | Hip-hop, Rock and roll, New York stories
LL Cool J | Hip-hop, Boombox, Block party
Public Enemy | Hip-hop, New York stories, Boombox
Grandmaster Flash | Hip-hop, Block party, Boombox
Salt-N-Pepa | Hip-hop, Street style, Block party
A Tribe Called Quest | Hip-hop, Mixtape, Street style
De La Soul | Hip-hop, Mixtape, Comedy
The Notorious B.I.G. | Hip-hop, New York stories, Stoop life
Wu-Tang Clan | Hip-hop, New York stories, Mixtape
Slick Rick | Hip-hop, Mixtape, Boombox
Eric B. & Rakim | Hip-hop, Boombox, Mixtape
Big Daddy Kane | Hip-hop, Street style, Block party
KRS-One | Hip-hop, New York stories, Boombox
Biz Markie | Hip-hop, Comedy, Block party
Whodini | Hip-hop, Boombox, Block party
Kurtis Blow | Hip-hop, Block party, Boombox
The Sugarhill Gang | Hip-hop, Block party, Disco
Blondie | Rock and roll, New York stories, Disco
Talking Heads | Rock and roll, New York stories
Ramones | Rock and roll, New York stories, Street style
Billy Joel | Rock and roll, New York stories, Skyline
Bruce Springsteen | Rock and roll, Stoop life
Madonna | Disco, Street style, New York stories
Michael Jackson | Disco, Boombox, Family
Prince | Rock and roll, Street style
Chic | Disco, Block party
Donna Summer | Disco, Block party
Bee Gees | Disco, Family
Cyndi Lauper | Street style, New York stories
Whitney Houston | Boombox, Family
`,
  film: `
Do the Right Thing | 1989 | New York stories, Stoop life, Block party
Saturday Night Fever | 1977 | New York stories, Disco, Stoop life
Rocky | 1976 | Drama, Stoop life
Taxi Driver | 1976 | New York stories, Drama
Annie Hall | 1977 | New York stories, Comedy, Skyline
Dog Day Afternoon | 1975 | New York stories, Drama
The Warriors | 1979 | New York stories, Street style, Coney Island
Fame | 1980 | New York stories, Street style
Wall Street | 1987 | New York stories, Skyline, Drama
Ghostbusters | 1984 | New York stories, Comedy, Blockbuster
Moonstruck | 1987 | New York stories, Family, Pizza slice
Crocodile Dundee | 1986 | New York stories, Comedy
The Goonies | 1985 | Family, Comedy, Blockbuster
Back to the Future | 1985 | Family, Blockbuster, Comedy
E.T. the Extra-Terrestrial | 1982 | Family, Blockbuster
Star Wars | 1977 | Blockbuster, Family
Raiders of the Lost Ark | 1981 | Blockbuster, Family
Beat Street | 1984 | Hip-hop, New York stories, Block party
Wild Style | 1983 | Hip-hop, New York stories, Street style
Krush Groove | 1985 | Hip-hop, Sneaker culture, Mixtape
Coming to America | 1988 | Comedy, New York stories
She's Gotta Have It | 1986 | New York stories, Comedy, Stoop life
Malcolm X | 1992 | New York stories, Drama
Jungle Fever | 1991 | New York stories, Drama, Stoop life
Boyz n the Hood | 1991 | Drama, Street style
Goodfellas | 1990 | New York stories, Drama, Pizza slice
Mo' Better Blues | 1990 | New York stories, Drama
Die Hard | 1988 | Blockbuster, New York stories
Top Gun | 1986 | Blockbuster
Ferris Bueller's Day Off | 1986 | Comedy, Baseball, Skyline
The Karate Kid | 1984 | Family
Breakin' | 1984 | Hip-hop, Street style, Block party
Pulp Fiction | 1994 | Drama
Reservoir Dogs | 1992 | Drama
Clerks | 1994 | Comedy, New York stories
The Godfather Part II | 1974 | New York stories, Drama, Family
Mean Streets | 1973 | New York stories, Drama, Stoop life
Grease | 1978 | Disco, Family
Backdraft | 1991 | Drama
`,
  tv: `
Saturday Night Live | 1975 | New York stories, Comedy, Skyline
Taxi | 1978 | New York stories, Sitcom, Comedy
Welcome Back, Kotter | 1975 | New York stories, Sitcom, Stoop life
Cheers | 1982 | Sitcom, Comedy, Baseball
The Cosby Show | 1984 | Sitcom, Family, Stoop life
A Different World | 1987 | Sitcom, Family, Hip-hop
Seinfeld | 1989 | New York stories, Sitcom, Comedy
The Simpsons | 1989 | Sitcom, Family, Comedy
Miami Vice | 1984 | Drama, Street style
Hill Street Blues | 1981 | New York stories, Drama
Yo! MTV Raps | 1988 | Hip-hop, Mixtape, Street style
Video Music Box | 1983 | Hip-hop, New York stories, Block party
Soul Train | 1971 | Disco, Street style, Block party
Happy Days | 1974 | Sitcom, Family, Rock and roll
Laverne & Shirley | 1976 | Sitcom, Comedy, Baseball
Three's Company | 1977 | Sitcom, Comedy
Dallas | 1978 | Drama, Family
Dynasty | 1981 | Drama
The A-Team | 1983 | Blockbuster, Comedy
Knight Rider | 1982 | Blockbuster
MacGyver | 1985 | Blockbuster
Family Ties | 1982 | Sitcom, Family
Growing Pains | 1985 | Sitcom, Family
Full House | 1987 | Sitcom, Family
The Golden Girls | 1985 | Sitcom, Comedy
Married... with Children | 1987 | Sitcom, Comedy
Roseanne | 1988 | Sitcom, Family, Stoop life
The Fresh Prince of Bel-Air | 1990 | Sitcom, Hip-hop, Street style
Friends | 1994 | New York stories, Sitcom, Comedy
Law & Order | 1990 | New York stories, Drama
NYPD Blue | 1993 | New York stories, Drama
Beverly Hills, 90210 | 1990 | Drama, Street style
The Wonder Years | 1988 | Family, Stoop life, Baseball
In Living Color | 1990 | Comedy, Hip-hop, Street style
Pee-wee's Playhouse | 1986 | Comedy, Family
`,
  book: `
The Shining | 1977 | Drama
The Hitchhiker's Guide to the Galaxy | 1979 | Comedy
The Color Purple | 1982 | Drama, Family
Bright Lights, Big City | 1984 | New York stories, Skyline, Street style
Less Than Zero | 1985 | Street style, Drama
The Bonfire of the Vanities | 1987 | New York stories, Skyline, Drama
American Psycho | 1991 | New York stories, Drama
Jurassic Park | 1990 | Blockbuster
Misery | 1987 | Drama
It | 1986 | Drama, Stoop life
The Hunt for Red October | 1984 | Blockbuster
Maus | 1986 | New York stories, Family
Watchmen | 1986 | New York stories, Drama, Blockbuster
The Dark Knight Returns | 1986 | New York stories, Blockbuster
Beloved | 1987 | Drama, Family
Sophie's Choice | 1979 | New York stories, Drama
Ragtime | 1975 | New York stories, Baseball, Drama
The Joy Luck Club | 1989 | Family
The Secret History | 1992 | Drama
Snow Crash | 1992 | Blockbuster, Arcade games
Neuromancer | 1984 | Arcade games, Blockbuster
Ender's Game | 1985 | Arcade games, Family
The Handmaid's Tale | 1985 | Drama
Lonesome Dove | 1985 | Drama, Family
Generation X | 1991 | Street style, Drama
Trainspotting | 1993 | Street style, Drama
High Fidelity | 1995 | Mixtape, Comedy, New York stories
Where's Waldo? | 1987 | Family, Comedy
Hatchet | 1987 | Family
The Baby-Sitters Club | 1986 | Family, Stoop life
Carrie | 1974 | Drama
Jaws | 1974 | Blockbuster, Drama
Fear of Flying | 1973 | New York stories, Comedy
Infinite Jest | 1996 | Arcade games, Comedy
Fight Club | 1996 | New York stories, Street style
`,
  place: `
Brooklyn Bridge | New York stories, Skyline, Family
Prospect Park | Family, Baseball, Block party
Coney Island | Coney Island, Arcade games, Family
Brooklyn Museum | Family, Skyline
Brooklyn Botanic Garden | Family, Stoop life
Junior's Restaurant | New York stories, Family, Pizza slice
Peter Luger Steak House | New York stories, Family
Di Fara Pizza | Pizza slice, New York stories, Stoop life
Nathan's Famous | Coney Island, Family, Baseball
Grimaldi's | Pizza slice, Skyline, New York stories
Totonno's | Pizza slice, Coney Island, Family
L&B Spumoni Gardens | Pizza slice, Family, Stoop life
Brooklyn Academy of Music | New York stories, Drama
Williamsburg Bridge | Skyline, New York stories
Brooklyn Heights Promenade | Skyline, New York stories, Family
Brooklyn Public Library | Family, Stoop life
Coney Island Cyclone | Coney Island, Arcade games, Family
Luna Park | Coney Island, Arcade games, Family
New York Aquarium | Coney Island, Family
Sheepshead Bay | Family, Stoop life
Brighton Beach | Coney Island, Family, Stoop life
Bay Ridge | Stoop life, Family
Fort Greene Park | Block party, Family, Hip-hop
Weeksville Heritage Center | Family, Stoop life
Brooklyn Brewery | New York stories, Skyline
Smorgasburg | Street style, Pizza slice
Ebbets Field Apartments | Baseball, Stoop life, Family
`,
  brand: `
Nathan's | Coney Island, Baseball, Family
Coca-Cola | Family, Block party
Pepsi | Family, Block party
Nike | Sneaker culture, Street style, Baseball
Adidas | Sneaker culture, Hip-hop, Street style
Puma | Sneaker culture, Street style
Kangol | Hip-hop, Street style
Champion | Street style, Baseball
FUBU | Hip-hop, Street style
Timberland | Street style, Hip-hop
Levi's | Street style
Polo Ralph Lauren | Street style, Skyline
Sony Walkman | Boombox, Mixtape
Atari | Arcade games, Family
Nintendo | Arcade games, Family
Sega | Arcade games
Commodore 64 | Arcade games, Family
Mattel | Family
Hasbro | Family
Cabbage Patch Kids | Family
Rubik's Cube | Arcade games, Family
Swatch | Street style
Casio | Street style, Boombox
Members Only | Street style, Disco
Reebok | Sneaker culture, Street style
Starter | Baseball, Street style
Guess | Street style, Disco
Mountain Dew | Arcade games, Block party
Yoo-hoo | New York stories, Baseball, Family
Snapple | New York stories, Stoop life
Entenmann's | Family, Stoop life
Sbarro | Pizza slice, New York stories
MTV | Hip-hop, Mixtape
Tower Records | Mixtape, Rock and roll
RadioShack | Boombox, Arcade games
`,
};
