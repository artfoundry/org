'use strict';

class UI {
    constructor(initialType) {
        this.navbar();
        this._listWatch();
        this._formWatch();
        this.currentType = initialType;
        this.currentItemName = '';
        this.messages = {
            'confirmEdit' : {text: 'You are about to save changes to an existing item.', hasCancel: true},
            'noName'      : {text: 'The logical name needs to be entered in order to save.', hasCancel: false}
        };
    }

    navbar() {
        $('#navbar .nav-link').click(() => {
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
            $('#card-thumb .card-container').show();
            $('#card-thumb').click(() => { this._showModal(); });
            this.updateForm();
        });
    }

    _formWatch() {
        $('form').submit((event) => {
            event.preventDefault();
            if ($(`#logical-${this.currentType}`)[0].value !== '') {
                let formData = $('form').serializeArray(),
                    itemName = formData[0].value,
                    saveData = () => { Tools.fbServices.processFormData(formData, this.currentType); };

                if (Tools.allItems.getItem(this.currentType, itemName)) {
                    this.showMessage(this.messages.confirmedit, saveData);
                } else {
                    saveData();
                }
            } else {
                this.showMessage(this.messages.noname);
            }
        });
        $('#reset-card').click(() => {
            $('#card-thumb .card-container').hide();
            $('#card-thumb').off('click');
        });
    }

    updateForm() {
        let item = Tools.allItems.getItem(this.currentType, this.currentItemName),
            $form = $(`#form-container-${this.currentType}`);

        $form.find('[name="logical"]')[0].value = this.currentItemName;
        if (item) {
            let faction = item.type;
            for (let attr in item) {
                let value = item[attr];
                if (Array.isArray(value)) {
                    for (let i=0; i < value.length; i++) {
                        $form.find(`[name="${attr}"][value="${value[i]}"]`)[0].checked = true;
                    }
                } else {
                    $form.find(`[name="${attr}"]`)[0].value = value;
                }
            }
            $('.card-container').addClass(`color-${faction}`);
            $('.card-faction').text(faction.charAt(0).toUpperCase() + faction.slice(1));
            // Uncomment once we have icon images ready
            // $('.card-icon').css('background-image', `url(${item.cardIcon})`);
            if (item[`end-game-${faction}`]) {
                $('.card-value').text(item[`end-game-${faction}`].slice(1));
            }
        }
    }

    updateList(type) {
        for (let item in Tools.allItems.getAllItems(type)) {
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
