"use strict";
mapboxgl.accessToken = 'pk.eyJ1IjoiaGFyaXowbiIsImEiOiJjbDdsb3F3eGwwaXFuM3BwOXl6YjJzMmxyIn0.OTVlNJD3DWoQRjM6WEjXAA';
const openWeatherApiKey = 'd1e4d1d53f86f2eae9c9de8aee8124ec';

class WeatherApp {
    constructor() {
        this.widgets = [];
        this.cityInput = document.querySelector('#city');
        this.latitudeInput = document.querySelector('#latitude');
        this.longitudeInput = document.querySelector('#longitude');
        this.widgetsList = document.querySelector('.main');
        document.querySelector('.header__buttons').addEventListener('click', evt => {
            if (evt.target && evt.target.matches('.btn')) {
                switch (evt.target.id) {
                    case 'addByCoords':
                        if (this.isValidInput(true)) {
                            this.createWidgetByCoords();
                        } else {
                            this.latitudeInput.classList.add('invalid');
                            this.longitudeInput.classList.add('invalid');
                        }
                        break;
                    case 'addByCity':
                        if (this.isValidInput()) {
                            this.createWidgetByCity();
                        } else {
                            this.cityInput.classList.add('invalid');
                        }
                        break;
                    case 'refreshAll':
                        this.updateAllWidgets();
                }
            }
        });
    }

    createWidgetByCoords() {
        fetch(`http://api.openweathermap.org/geo/1.0/reverse?lat=${this.latitudeInput.value}&lon=${this.longitudeInput.value}&limit=1&appid=${openWeatherApiKey}`)
            .then(data => data.json())
            .then(json => {
                this.widgets.push(new widget(this.latitudeInput.value, this.longitudeInput.value, this.widgets.length, this.widgetsList, json[0].local_names.ru));
            });
    }

    createWidgetByCity() {
        fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${this.cityInput.value}&limit=1&appid=${openWeatherApiKey}`)
            .then(data => data.json())
            .then(json => {
                this.widgets.push(new widget(json[0].lat, json[0].lon, this.widgets.length, this.widgetsList, json[0].local_names.ru));
            });
    }

    updateAllWidgets() {
        this.widgets.forEach(widget => {
            widget.update();
        });
    }

    isValidInput(isCoords = false) {
        if (isCoords) {
            return this.latitudeInput.value && this.longitudeInput &&
                parseFloat(this.latitudeInput.value) <= 90 && parseFloat(this.latitudeInput.value) >= 0 &&
                parseFloat(this.longitudeInput.value) <= 90 && parseFloat(this.longitudeInput.value) >= 0;
        }
        return this.cityInput.value && !this.cityInput.value.match(/[a-z]/i);
    }
}

class widget {
    constructor(latitude, longitude, id, block, city) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.id = id;
        this.city = city;
        this.isActive = true;
        this.section = document.createElement('section');
        this.section.classList.add('widget');
        this.section.innerHTML = `
            <div class="container">
                <div class="widget__inner">
                    <div class="widget__header">
                        <h3 class="widget__title">Город: ${this.city} Широта: ${this.latitude} Долгота: ${this.longitude}</h3>
                        <div class="widget__buttons">
                            <buttom widgetAction="refresh" class="btn btn_round"><svg class="widget__button-icon"><use xlink:href="#refresh"></use></svg></buttom>
                            <buttom widgetAction="close" class="btn btn_round"><svg class="widget__button-icon"><use xlink:href="#close"></use></svg></buttom>
                        </div>
                    </div>
                    <div class="widget__data">
                        <svg class="widget__loading"><use xlink:href="#loading"></use></svg>
                    </div>
                </div>
            </div>
        `;
        this.dataSection = this.section.querySelector('.widget__data');
        this.section.setAttribute('widgetId', id);
        this.section.querySelectorAll('.btn_round').forEach(elem => {
            elem.addEventListener('click', e => {
                console.log('22');
                if (e.target && e.currentTarget.matches('[widgetAction="refresh"]')) {
                    this.update();
                }
                if (e.target && e.currentTarget.matches('[widgetAction="close"]')) {
                    this.delete();
                }
            });
        });
        block.append(this.section);
        this.render();
    }
    render() {
        this.getJsonData(this.longitude, this.latitude)
            .then(data => {
                if (data.cod != 200) {
                    throw new Error(`Произошла ошибка! Код: ${data.cod}`);
                }
                this.dataSection.innerHTML = `
                    <img class="widget__theme-icon" src="http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="">
                    <div class="widget__info">
                        <h3 class="widget__general-text">${data.weather[0].description.toUpperCase()}</h3>
                        <p class="widget__text">Температура: ${data.main.temp} °C</p>
                        <p class="widget__text">Ощущается как: ${data.main.feels_like} °C</p>
                        <p class="widget__text">Влажность: ${data.main.humidity}%</p>
                        <p class="widget__text">Скорость ветра: ${data.wind.speed} м/c</p>
                    </div>
                    <div class="widget__img-box" id="widgetImgBox-${this.id}"></div>
                    `;
                new mapboxgl.Map({
                    container: `widgetImgBox-${this.id}`,
                    style: 'mapbox://styles/mapbox/streets-v11',
                    center: [this.longitude, this.latitude],
                    zoom: 11,
                    projection: 'equalEarth'
                });
            })
            .catch(error => {
                this.dataSection.innerHTML = `
                    <div class="error">
                        <h3 class="error__title">Произошла ошибка. Попробуйте запрос позже</h3>
                        <p class="error__descr">Виджет будет удален через 3 секунды</p>
                    </div>
                    `;
                setTimeout(() => {
                    this.delete();
                }, 3000);
            });
    }


    async getJsonData(lat, long) {
        return await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${long}&appid=${openWeatherApiKey}&units=metric&lang=ru`)
            .then(data => data.json())
            .catch(error => error);
    }

    delete() {
        if (!this.isActive) {
            return;
        }
        this.section.remove();
        this.isActive = !this.isActive;
    }

    update() {
        if (!this.isActive) {
            return;
        }
        this.dataSection.innerHTML = `
                <svg class="widget__loading"><use xlink:href="#loading"></use></svg>
            `;
        this.render();
    }
}

let x = new WeatherApp();