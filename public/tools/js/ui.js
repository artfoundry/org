class UI {
    constructor(allItems) {
        this.allItems = allItems;
        this.navbar();
        this._listWatch();
        this._formWatch();
        this.messages = {
            'confirmEdit' : {text: 'You are about to save changes to an existing item.', hasCancel: true},
            'noName'      : {text: 'The logical name needs to be entered in order to save.', hasCancel: false}
        };
    }

    navbar() {
        $('#navbar .nav-link').click(function() {
            if (!$(this).hasClass('active')) {
                let oldTarget = $('#navbar .active').attr('id').substring(8),
                    newTarget = $(this).attr('id').substring(8);

                $('#navlink-' + oldTarget).removeClass('active');
                $('#navlink-' + newTarget).addClass('active');
                $('#form-container-' + oldTarget).toggle().addClass('inactive');
                $('#list-' + oldTarget).toggle().addClass('inactive');
                $('#form-container-' + newTarget).toggle().removeClass('inactive');
                $('#list-' + newTarget).toggle().removeClass('inactive');
            }
        });
    }

    _listWatch(itemID) {
        let ui = this;

        $('#' + itemID).click(function(event) {
            let itemName = event.currentTarget.id,
                type = $(event.currentTarget).parents('.list-container').attr('id').substring(5);

            $('#form-' + type).trigger('reset');
            ui.updateForm(type, itemName);
        });
    }

    _formWatch() {
        let ui = this;

        $('form').submit(function(event) {
            event.preventDefault();

            let type = $(event.currentTarget).find('.button-submit').attr('id').substring(7);

            if ($('#logical-' + type)[0].value !== '') {
                let formData = $(this).serializeArray(),
                    itemName = formData[0].value,
                    saveData = function() { Tools.fbServices.processFormData(formData, type); };

                if (ui.allItems.getItem(type, itemName)) {
                    ui.showMessage(ui.messages.confirmEdit, saveData);
                } else {
                    saveData();
                }
            } else {
                ui.showMessage(ui.messages.noName);
            }
        });

        $('.thumbnail').click(function() {
            $('.card-preview').toggle(function() {
                $('.card-preview-container').css('outlineColor', 'orange'); //need data for this instead
                $('.card-preview-thumbnail').css('backgroundImage', 'url("../images/commercial-icon.png")') //need data for this instead
                $('.card-preview-title').text('Commercial'); //need data for this instead
                $('.card-preview-value').text('2'); //need data for this instead
                $('body').click(function() {
                    $('.card-preview').hide();
                    $(this).off();
                });
            });
        });
    }

    updateForm(type, itemName) {
        let item = this.allItems.getItem(type, itemName),
            $form = $('#form-container-' + type);

        $form.find("[name='logical']")[0].value = itemName;
        for (let attr in item) {
            let value = item[attr];
            if (Array.isArray(value)) {
                for (let i=0; i < value.length; i++) {
                    $form.find("[name='" + attr + "'][value='" + value[i] + "']")[0].checked = true;
                }
            } else {
                $form.find("[name='" + attr + "']")[0].value = value;
            }
        }
    }

    updateList(type, items) {
        for (let item in items) {
            let $itemID = $('#' + item);

            if ($itemID.length === 0) {
                $("#list-" + type + " > .list").append("<div id='" + item + "' class='list-item-row'></div>");
                $itemID = $('#' + item);
            } else {
                $itemID.html('');
            }
            $itemID.append("<span class='list-item-name'>" + item + "</span>");
            this._listWatch(item);
        }
    }

    showMessage(message, callback = null) {
        let $message = $('#message'),
            $cancelButton = $message.find('.button-reset'),
            ui = this;

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
