'use strict';

class UI {
    constructor(initialType) {
        this.currentType = initialType;
        this.currentItemName = '';
        this.navbar();
        this._listWatch();
        this._formWatch();
        this.messages = {
            'confirmEdit' : {text: 'You are about to save changes to an existing item.', hasCancel: true},
            'noName'      : {text: 'The logical name needs to be entered in order to save.', hasCancel: false}
        };
    }

    navbar() {
        $('#navbar .nav-link').click((event) => {
            if (!$(`#${event.target.id}`).hasClass('active')) {
                let newTargetId = event.target.id.substring(8);
                let oldTargetId = $('#navbar .active').attr('id').substring(8);

                $(`#navlink-${oldTargetId}`).removeClass('active');
                $(`#navlink-${newTargetId}`).addClass('active');
                $(`#form-container-${oldTargetId}`).toggle().addClass('inactive');
                $(`#list-${oldTargetId}`).toggle().addClass('inactive');
                $(`#form-container-${newTargetId}`).toggle().removeClass('inactive');
                $(`#list-${newTargetId}`).toggle().removeClass('inactive');
                this.currentType = newTargetId;
            }
        });
    }

    _listWatch(itemID) {
        $(`#${itemID}`).click((event) => {
            this.currentItemName = event.currentTarget.id;
            $(`#form-${this.currentType}`).trigger('reset');
            this._activateItemPreview();
            this.updateForm();
        });
    }

    _activateItemPreview() {
        $(`#${this.currentType}-thumb .${this.currentType}-container`).show();
        $(`#${this.currentType}-thumb`).click(() => { this._showModal(); });
    }

    _setItemPreview(faction, item) {
        let imageClass = `image-${this.currentType}-${faction}`;

        if (imageClass)
            $(`.${this.currentType}-image`).attr('class', `${this.currentType}-image ${imageClass}`);
        if (item && this.currentType === 'card') {
            $(`.${this.currentType}-container`).attr('class', `${this.currentType}-container color-${faction}`);
            $(`.${this.currentType}-faction`).text(faction.charAt(0).toUpperCase() + faction.slice(1));
            if (item[`end-game-${faction}`]) {
                $('.card-value').text(item[`end-game-${faction}`].slice(1));
            }
        }
    }

    _formWatch() {
        $('form').submit((event) => {
            event.preventDefault();
            if ($(`#item-name-${this.currentType}`)[0].value !== '') {
                let formData = $(`#form-${this.currentType}`).serializeArray(),
                    itemName = formData[0].value,
                    saveData = () => { Tools.fbServices.processFormData(formData, this.currentType); };

                if (Tools.allItems.getItem(this.currentType, itemName)) {
                    this.showMessage(this.messages.confirmEdit, saveData);
                } else {
                    saveData();
                }
            } else {
                this.showMessage(this.messages.noName);
            }
        });
        $(`#reset-${this.currentType}`).click(() => {
            $(`#${this.currentType}-thumb .${this.currentType}-container`).hide();
            $(`#${this.currentType}-thumb`).off('click');
        });
        $('#draw-action-rule1-card').on('change', (el) => {
            let propBool = $(el.currentTarget).val() === 'move';
            $('#draw-destination-rule1-card').prop('disabled', !propBool);
        });
        $('#draw-action-rule2-card').on('change', (el) => {
            let propBool = $(el.currentTarget).val() === 'move';
            $('#draw-destination-rule2-card').prop('disabled', !propBool);
        });
        $('#draw-cond-comp-rule1-card').on('change', (el) => {
            let propBool = $(el.currentTarget).val() === 'value';
            $('#draw-cond-comp-value-rule1-card').prop('disabled', !propBool);
        });
        $('#draw-cond-comp-rule2-card').on('change', (el) => {
            let propBool = $(el.currentTarget).val() === 'value';
            $('#draw-cond-comp-value-rule2-card').prop('disabled', !propBool);
        });
        $(`#type-${this.currentType}`).on('change', (el) => {
            let faction = $(el.currentTarget).val();
            this._activateItemPreview();
            this._setItemPreview(faction);
        });
    }

    updateForm() {
        let item = Tools.allItems.getItem(this.currentType, this.currentItemName),
            $form = $(`#form-container-${this.currentType}`);

        $form.find('[name="item-name"]')[0].value = this.currentItemName;
        if (item) {
            let faction = item.type;

            for (let attr in item) {
                if (item.hasOwnProperty(attr)) {
                    let value = item[attr];

                    if (attr === 'text') {
                        $form.find(`[name="${attr}"]`)[0].innerText = value;
                    } else if (attr.indexOf('polities') === 0) {
                        $form.find(`[name="${attr}"]`)[0].checked = true;
                    } else {
                        $($form.find(`[name="${attr}"]`)[0]).val(value);
                    }
                }
            }
            this._setItemPreview(faction, item);
        }
    }

    updateList(type) {
        let items = Tools.allItems.getAllItems(type);
        for (let item in items) {
            if (items.hasOwnProperty(item)) {
                let $itemID = $(`#${item}`);

                if ($itemID.length === 0) {
                    $(`#list-${type} > .list`).append(`<div id="${item}" class="list-item-row"></div>`);
                    $itemID = $(`#${item}`);
                } else {
                    $itemID.html('');
                }
                $itemID.append(`<span class="list-item-name">${item}</span>`);
                this._listWatch(item);
            }
        }
    }

    _showModal() {
        let $body = $('body');

        $('#card-preview').show(() => {
            $body.addClass('modal-open');
            $body.click(() => {
                $('#card-preview').hide();
                $('body').off('click').removeClass('modal-open');
            });
        });
    }

    showMessage(message, callback = null) {
        let $message = $('#message'),
            $cancelButton = $message.find('.button-reset');

        $message.toggle().find('.text').text(message.text);
        message.hasCancel ? $cancelButton.show() : $cancelButton.hide();
        $message.find('button').click(function() {
            $message.toggle();
            $message.find('button').off('click');
            if ($(this).hasClass('button-submit') && callback !== null)
                callback();
        });
    }
}
