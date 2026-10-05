import type { PersonaSpec } from "./spec";

/** P3 Rosa, born 1952, Guadalajara, Mexico. Window 1962 to 1982. Avoids "Amor eterno" and hospitals. */
export const P3: PersonaSpec = {
  id: "p3",
  seeds: ["fx-artist-pedro-infante", "fx-artist-juan-gabriel", "fx-tv-el-chavo-del-ocho"],
  locations: ["Guadalajara", "Guadalajara, Mexico", "Guadalajara, Jalisco"],
  window: { min: 1962, max: 1982 },
  fingerprint: [
    "Mariachi", "Ranchera", "Telenovela", "Golden Age cinema", "Family", "Mexican comfort food", "Comedy",
    "Bolero", "Folk traditions", "Latin pop", "Magical realism", "Street food", "Sunday mass", "Fiesta",
    "Lucha libre", "Tequila country", "Cantina", "Pueblo life", "Romantic drama", "Cartoons",
  ],
  music: `
Pedro Infante | Ranchera, Golden Age cinema, Mariachi
Juan Gabriel | Ranchera, Latin pop, Romantic drama
Jorge Negrete | Ranchera, Golden Age cinema, Mariachi
Vicente Fernández | Ranchera, Mariachi, Tequila country
José Alfredo Jiménez | Ranchera, Cantina, Mariachi
Javier Solís | Bolero, Ranchera, Romantic drama
Lola Beltrán | Ranchera, Mariachi, Fiesta
Trio Los Panchos | Bolero, Romantic drama
Rocío Dúrcal | Ranchera, Latin pop, Romantic drama
Armando Manzanero | Bolero, Romantic drama
Cuco Sánchez | Ranchera, Cantina
Chavela Vargas | Ranchera, Cantina, Folk traditions
Lucha Villa | Ranchera, Mariachi, Fiesta
Antonio Aguilar | Ranchera, Mariachi, Pueblo life
Flor Silvestre | Ranchera, Pueblo life
Los Tigres del Norte | Folk traditions, Pueblo life
Mariachi Vargas de Tecalitlán | Mariachi, Fiesta, Folk traditions
Emmanuel | Latin pop, Romantic drama
José José | Latin pop, Bolero, Romantic drama
Roberto Carlos | Latin pop, Romantic drama
Los Bukis | Latin pop, Romantic drama, Fiesta
Los Terrícolas | Latin pop, Fiesta
Angélica María | Latin pop, Telenovela, Family
Enrique Guzmán | Latin pop, Fiesta
César Costa | Latin pop, Family
Napoleón | Latin pop, Romantic drama
Raphael | Latin pop, Romantic drama
Julio Iglesias | Latin pop, Romantic drama
Marco Antonio Muñiz | Bolero, Romantic drama
Pedro Vargas | Bolero, Golden Age cinema
Agustín Lara | Bolero, Golden Age cinema, Romantic drama
Mariachi Cobre | Mariachi, Fiesta
Amor Eterno Tribute Band | Latin pop, Romantic drama, Bolero
`,
  film: `
El Padrecito | 1964 | Comedy, Sunday mass, Pueblo life
Su Excelencia | 1967 | Comedy, Golden Age cinema
El Analfabeto | 1961 | Comedy, Golden Age cinema
Macario | 1960 | Magical realism, Folk traditions, Pueblo life
El ángel exterminador | 1962 | Magical realism
Simón del desierto | 1965 | Magical realism, Sunday mass
Pedro Páramo | 1967 | Magical realism, Pueblo life
Los Caifanes | 1967 | Comedy, Street food
Canoa | 1976 | Pueblo life, Sunday mass
El Topo | 1970 | Magical realism
Calzonzin Inspector | 1974 | Comedy, Pueblo life
Santo contra las mujeres vampiro | 1962 | Lucha libre
Santo en el Museo de Cera | 1963 | Lucha libre
Santo y Blue Demon contra los monstruos | 1970 | Lucha libre, Cartoons
Los hermanos del hierro | 1961 | Pueblo life, Romantic drama
El gallo de oro | 1964 | Ranchera, Pueblo life, Cantina
Nobleza ranchera | 1977 | Ranchera, Family
El Chanfle | 1979 | Comedy, Family
El Chanfle II | 1982 | Comedy, Family
Los Beverly de Peralvillo | 1971 | Comedy, Family
Mecánica Nacional | 1972 | Comedy, Cantina
Chanoc | 1967 | Comedy, Family
Kalimán | 1972 | Cartoons, Family
El Padrino | 1972 | Romantic drama
Tiburón | 1975 | Family
La guerra de las galaxias | 1977 | Family, Cartoons
Fiebre de sábado por la noche | 1977 | Fiesta, Latin pop
Grease | 1978 | Fiesta, Latin pop
E.T. el extraterrestre | 1982 | Family
La novicia rebelde | 1965 | Family, Sunday mass
Mary Poppins | 1964 | Family, Cartoons
Historia de amor | 1970 | Romantic drama
Doctor Zhivago | 1965 | Romantic drama
Bonnie y Clyde | 1967 | Romantic drama
Viridiana | 1961 | Sunday mass, Magical realism
Cri-Cri el grillito cantor | 1963 | Cartoons, Family, Folk traditions
`,
  tv: `
El Chavo del Ocho | 1971 | Comedy, Family, Street food
El Chapulín Colorado | 1970 | Comedy, Family, Cartoons
Chespirito | 1970 | Comedy, Family
Siempre en domingo | 1969 | Latin pop, Fiesta, Family
En familia con Chabelo | 1968 | Family, Cartoons
Odisea Burbujas | 1978 | Cartoons, Family
Plaza Sésamo | 1972 | Family, Cartoons
Los Supersabios | 1974 | Family, Comedy
Telesecundaria | 1968 | Family
Los ricos también lloran | 1979 | Telenovela, Romantic drama
Colorina | 1980 | Telenovela, Romantic drama
Gutierritos | 1968 | Telenovela, Family
Corazón salvaje | 1966 | Telenovela, Romantic drama, Pueblo life
El derecho de nacer | 1966 | Telenovela, Romantic drama
Muchacha italiana viene a casarse | 1971 | Telenovela, Romantic drama
Mundo de juguete | 1974 | Family, Cartoons
Chispita | 1982 | Telenovela, Family
El Show de Cantinflas | 1964 | Comedy, Golden Age cinema
General Hospital | 1963 | Romantic drama
Batman | 1966 | Cartoons, Family
Bewitched | 1964 | Comedy, Family
Mission: Impossible | 1966 | Family
Kung Fu | 1972 | Family
Astroboy | 1963 | Cartoons, Family
Mazinger Z | 1972 | Cartoons, Family
Heidi | 1974 | Cartoons, Family, Pueblo life
Candy Candy | 1976 | Cartoons, Romantic drama
Los Picapiedra | 1960 | Cartoons, Family, Comedy
La dimensión desconocida | 1959 | Magical realism
Los Polivoces | 1969 | Comedy, Family
Cri-Cri | 1965 | Family, Folk traditions, Cartoons
`,
  book: `
La muerte de Artemio Cruz | 1962 | Magical realism, Pueblo life
Aura | 1962 | Magical realism
Rayuela | 1963 | Magical realism, Romantic drama
Los albañiles | 1963 | Pueblo life
Mafalda | 1964 | Comedy, Family, Cartoons
Farabeuf | 1965 | Magical realism
Los Supermachos | 1965 | Comedy, Cartoons, Pueblo life
Cien años de soledad | 1967 | Magical realism, Family, Pueblo life
Zona sagrada | 1967 | Romantic drama
Hasta no verte, Jesús mío | 1969 | Pueblo life, Sunday mass
El padrino | 1969 | Family
Juan Salvador Gaviota | 1970 | Magical realism
Historia de amor | 1970 | Romantic drama
El obsceno pájaro de la noche | 1970 | Magical realism
El exorcista | 1971 | Sunday mass
Si te dicen que caí | 1973 | Pueblo life
Tiburón | 1974 | Family
Terra Nostra | 1975 | Magical realism
El otoño del patriarca | 1975 | Magical realism, Pueblo life
El beso de la mujer araña | 1976 | Romantic drama
Libro Vaquero | 1978 | Comedy, Cartoons, Pueblo life
Crónica de una muerte anunciada | 1981 | Magical realism, Pueblo life
Las batallas en el desierto | 1981 | Family, Street food
La casa de los espíritus | 1982 | Magical realism, Family
Oficio de tinieblas | 1962 | Pueblo life, Sunday mass
Los recuerdos del porvenir | 1963 | Magical realism, Pueblo life
La ciudad y los perros | 1963 | Pueblo life
Gracias por el fuego | 1965 | Romantic drama
Los cachorros | 1967 | Pueblo life
Conversación en La Catedral | 1969 | Pueblo life
La tregua | 1960 | Romantic drama, Family
El amor en los tiempos del cólera | 1985 | Romantic drama, Magical realism
Arráncame la vida | 1985 | Telenovela, Romantic drama
Gringo viejo | 1985 | Pueblo life
`,
  place: `
Catedral de Guadalajara | Sunday mass, Folk traditions, Pueblo life
Instituto Cultural Cabañas | Folk traditions, Magical realism, Family
Mercado San Juan de Dios | Street food, Mexican comfort food, Fiesta
Teatro Degollado | Golden Age cinema, Family, Romantic drama
Plaza de los Mariachis | Mariachi, Fiesta, Cantina
San Pedro Tlaquepaque | Folk traditions, Mariachi, Street food
Tonalá Market | Folk traditions, Street food
Bosque Los Colomos | Family, Pueblo life
Parque Agua Azul | Family, Pueblo life
Zoológico Guadalajara | Family, Cartoons
Plaza de Armas | Fiesta, Family, Mariachi
Plaza Tapatía | Fiesta, Family
Palacio de Gobierno | Folk traditions, Sunday mass
Museo Regional de Guadalajara | Folk traditions, Family
Mercado Corona | Street food, Mexican comfort food
Estadio Jalisco | Lucha libre, Family, Fiesta
Birriería Las 9 Esquinas | Mexican comfort food, Tequila country, Family
Karne Garibaldi | Mexican comfort food, Family
La Chata | Mexican comfort food, Family, Sunday mass
Templo Expiatorio | Sunday mass, Folk traditions
Basílica de Zapopan | Sunday mass, Fiesta, Folk traditions
Rotonda de los Jaliscienses Ilustres | Folk traditions, Family
Parque Revolución | Family, Street food
Casa de las Artesanías | Folk traditions
Lago de Chapala | Family, Pueblo life, Tequila country
Tequila, Jalisco | Tequila country, Mariachi, Cantina
Cantina La Fuente | Cantina, Ranchera, Fiesta
`,
  brand: `
Sabritas | Family, Street food
Bimbo | Family, Mexican comfort food
Marinela | Family, Cartoons
Gansito Marinela | Family, Cartoons
Coca-Cola | Family, Fiesta
Pepsi | Family, Fiesta
Jarritos | Street food, Fiesta
Sidral Mundet | Family, Street food
Tequila Jose Cuervo | Tequila country, Fiesta, Cantina
Herradura | Tequila country, Cantina
Corona | Fiesta, Cantina
Modelo | Fiesta, Cantina
Nescafé | Family, Mexican comfort food
Nestlé | Family
Chocolate Abuelita | Mexican comfort food, Family
Ibarra | Mexican comfort food, Family
Maizena | Mexican comfort food, Family
Knorr Suiza | Mexican comfort food, Family
Zote | Family
Fab | Family
Vicks | Family
Kleenex | Family
Gamesa | Family, Mexican comfort food
Ricolino | Family, Cartoons
Lala | Family, Mexican comfort food
Alpura | Family
Herdez | Mexican comfort food, Family
La Costeña | Mexican comfort food, Family
Volkswagen Beetle | Family, Street food
Aurrerá | Family
Sears México | Family, Fiesta
El Palacio de Hierro | Family, Fiesta
Liverpool | Family, Fiesta
Singer | Family, Folk traditions
`,
};
