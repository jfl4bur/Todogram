const { Client } = require('@notionhq/client');

class NotionService {
    constructor(token, databaseId) {
        this.notion = new Client({ auth: token });
        this.databaseId = databaseId;
        this.relationDatabases = {
            categoria: '168ff30851b6812b9ad9dce522ff6c9a',
            generos: '168ff30851b681bcbbd7d6bf049013d9',
            audios: '195ff30851b6800abc2bef47e239f14f',
            subtitulos: '195ff30851b68090b0e4c85a0423e504'
        };
    }

    async getMovies() {
        try {
            const response = await this.notion.databases.query({
                database_id: this.databaseId,
                sorts: [
                    {
                        property: 'Título',
                        direction: 'ascending'
                    }
                ]
            });

            return response.results.map(page => this.formatMovieData(page));
        } catch (error) {
            console.error('Error fetching movies:', error);
            throw error;
        }
    }

    async getPendingMovies() {
        try {
            const response = await this.notion.databases.query({
                database_id: this.databaseId,
                filter: {
                    property: 'Categoría',
                    relation: {
                        is_empty: true
                    }
                }
            });

            return response.results.map(page => this.formatMovieData(page));
        } catch (error) {
            console.error('Error fetching pending movies:', error);
            throw error;
        }
    }

    async createMovie(movieData) {
        try {
            const properties = await this.buildMovieProperties(movieData);
            
            const response = await this.notion.pages.create({
                parent: { database_id: this.databaseId },
                properties
            });

            return this.formatMovieData(response);
        } catch (error) {
            console.error('Error creating movie:', error);
            throw error;
        }
    }

    async updateMovie(movieId, updates) {
        try {
            const properties = await this.buildMovieProperties(updates);
            
            const response = await this.notion.pages.update({
                page_id: movieId,
                properties
            });

            return this.formatMovieData(response);
        } catch (error) {
            console.error('Error updating movie:', error);
            throw error;
        }
    }

    async deleteMovie(movieId) {
        try {
            await this.notion.pages.update({
                page_id: movieId,
                archived: true
            });
            return true;
        } catch (error) {
            console.error('Error deleting movie:', error);
            throw error;
        }
    }

    async buildMovieProperties(data) {
        const properties = {};

        // Título
        if (data.titulo) {
            properties['Título'] = {
                title: [{ text: { content: data.titulo } }]
            };
        }

        // Campos de texto
        const textFields = {
            'titulo_episodio': 'Título episodio',
            'temporada': 'Temporada',
            'episodios': 'Episodios',
            'duracion': 'Duración',
            'synopsis': 'Synopsis'
        };

        Object.entries(textFields).forEach(([key, notionKey]) => {
            if (data[key]) {
                properties[notionKey] = {
                    rich_text: [{ text: { content: data[key] } }]
                };
            }
        });

        // Campos numéricos
        if (data.ano) {
            properties['Año'] = {
                number: parseInt(data.ano) || 0
            };
        }

        if (data.puntuacion) {
            properties['Puntuación 1-10'] = {
                number: parseFloat(data.puntuacion) || 0
            };
        }

        // URLs
        const urlFields = {
            'tmdb': 'TMDB',
            'video_iframe': 'Video iframe',
            'video_iframe_1': 'Video iframe 1'
        };

        Object.entries(urlFields).forEach(([key, notionKey]) => {
            if (data[key]) {
                properties[notionKey] = { url: data[key] };
            }
        });

        // Relaciones
        if (data.categoria) {
            const categoryId = await this.findOrCreateRelatedPage(
                this.relationDatabases.categoria, 
                data.categoria
            );
            properties['Categoría'] = {
                relation: [{ id: categoryId }]
            };
        }

        if (data.generos && data.generos.length > 0) {
            const genreIds = await this.processRelations(data.generos, this.relationDatabases.generos);
            properties['Géneros'] = {
                relation: genreIds
            };
        }

        if (data.audios && data.audios.length > 0) {
            const audioIds = await this.processRelations(data.audios, this.relationDatabases.audios);
            properties['Audios'] = {
                relation: audioIds
            };
        }

        if (data.subtitulos && data.subtitulos.length > 0) {
            const subtitleIds = await this.processRelations(data.subtitulos, this.relationDatabases.subtitulos);
            properties['Subtítulos'] = {
                relation: subtitleIds
            };
        }

        // Imágenes
        if (data.portada) {
            properties['Portada'] = {
                files: [{
                    name: 'portada',
                    type: 'external',
                    external: { url: data.portada }
                }]
            };
        }

        if (data.carteles) {
            properties['Carteles'] = {
                files: [{
                    name: 'carteles',
                    type: 'external',
                    external: { url: data.carteles }
                }]
            };
        }

        return properties;
    }

    async processRelations(items, databaseId) {
        const relations = [];
        
        for (const item of items) {
            try {
                const pageId = await this.findOrCreateRelatedPage(databaseId, item);
                relations.push({ id: pageId });
            } catch (error) {
                console.error(`Error processing relation ${item}:`, error);
            }
        }
        
        return relations;
    }

    async findOrCreateRelatedPage(databaseId, title) {
        try {
            const titlePropertyName = await this.getTitlePropertyName(databaseId);
            
            const searchResponse = await this.notion.databases.query({
                database_id: databaseId,
                filter: {
                    property: titlePropertyName,
                    title: { equals: title }
                }
            });

            if (searchResponse.results.length > 0) {
                return searchResponse.results[0].id;
            }

            const createResponse = await this.notion.pages.create({
                parent: { database_id: databaseId },
                properties: {
                    [titlePropertyName]: {
                        title: [{ text: { content: title } }]
                    }
                }
            });

            return createResponse.id;
        } catch (error) {
            console.error(`Error with page ${title}:`, error);
            throw error;
        }
    }

    async getTitlePropertyName(databaseId) {
        try {
            const database = await this.notion.databases.retrieve({ database_id: databaseId });
            
            for (const [propertyName, property] of Object.entries(database.properties)) {
                if (property.type === 'title') {
                    return propertyName;
                }
            }
            
            return 'Name';
        } catch (error) {
            console.error('Error getting title property name:', error);
            return 'Name';
        }
    }

    formatMovieData(page) {
        const properties = page.properties;
        
        return {
            id: page.id,
            titulo: this.extractText(properties['Título']),
            titulo_episodio: this.extractText(properties['Título episodio']),
            temporada: this.extractText(properties['Temporada']),
            episodios: this.extractText(properties['Episodios']),
            duracion: this.extractText(properties['Duración']),
            synopsis: this.extractText(properties['Synopsis']),
            ano: properties['Año']?.number || 0,
            puntuacion: properties['Puntuación 1-10']?.number || 0,
            tmdb: properties['TMDB']?.url || '',
            video_iframe: properties['Video iframe']?.url || '',
            video_iframe_1: properties['Video iframe 1']?.url || '',
            categoria: this.extractRelation(properties['Categoría']),
            generos: this.extractRelations(properties['Géneros']),
            audios: this.extractRelations(properties['Audios']),
            subtitulos: this.extractRelations(properties['Subtítulos']),
            portada: this.extractFile(properties['Portada']),
            carteles: this.extractFile(properties['Carteles']),
            created_time: page.created_time,
            last_edited_time: page.last_edited_time
        };
    }

    extractText(property) {
        if (!property) return '';
        
        if (property.type === 'title') {
            return property.title.map(t => t.plain_text).join('');
        } else if (property.type === 'rich_text') {
            return property.rich_text.map(t => t.plain_text).join('');
        }
        
        return '';
    }

    extractRelation(property) {
        if (!property || !property.relation || property.relation.length === 0) {
            return '';
        }
        return property.relation[0].id;
    }

    extractRelations(property) {
        if (!property || !property.relation) {
            return [];
        }
        return property.relation.map(rel => rel.id);
    }

    extractFile(property) {
        if (!property || !property.files || property.files.length === 0) {
            return '';
        }
        
        const file = property.files[0];
        if (file.type === 'external') {
            return file.external.url;
        } else if (file.type === 'file') {
            return file.file.url;
        }
        
        return '';
    }
}

module.exports = NotionService;