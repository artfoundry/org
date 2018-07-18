class UI {
    constructor(allItems) {
        this.allItems = allItems;
        this.navbar();
        this._listWatch();
        this._formWatch();
        this.messages = {
            'duplicate' : "This item already exists. Select it from the list to edit."
        };
    }

    navbar() {
        $("#navbar .nav-link").click(function() {
            if (!$(this).hasClass("active")) {
                let oldTarget = $("#navbar .active").attr("id").substring(8),
                    newTarget = $(this).attr("id").substring(8);

                $("#navlink-" + oldTarget).removeClass("active");
                $("#navlink-" + newTarget).addClass("active");
                $("#form-" + oldTarget).toggle().addClass("inactive");
                $("#list-" + oldTarget).toggle().addClass("inactive");
                $("#form-" + newTarget).toggle().removeClass("inactive");
                $("#list-" + newTarget).toggle().removeClass("inactive");
            }
        });
    }

    _listWatch() {
        let ui = this;

        $(".list-item-row").click(function(event) {
            let itemName = event.currentTarget.id,
                type = $(event.currentTarget).parents(".list-container").attr("id").substring(6);

            ui.updateForm(type, itemName);
        });
    }

    _formWatch() {
        let ui = this;

        $("form").submit(function(event) {
            event.preventDefault();
            let type = $(event.currentTarget).find(".button-submit").attr("id").substring(7),
                formData = $(this).serializeArray(),
                itemName = formData[0].value;
            if (ui.allItems.getItem(type, itemName)) {
                ui.showMessage(ui.messages.duplicate);
            } else {
                Tools.fbServices.processFormData(formData, type);
            }
        });
    }

    updateForm(type, itemName) {
        let item = this.allItems.getItem(type, itemName);


        // for (let attr in item) {
        //     let value = item[attr];
        //     if (Array.isArray(value)) {
        //         value = value.join(', ');
        //     }
        //     $itemID.append("<span class='item-attr'>" + attr + " : " + value + "</span>");
        // }
    }

    updateList(type, items) {
        for (let item in items) {
            let $itemID = $("#" + item);

            if ($itemID.length === 0) {
                $("#list-" + type + " > .list").append("<div id='" + item + "' class='list-item-row'></div>");
                $itemID = $("#" + item);
            } else {
                $itemID.html("");
            }
            $itemID.append("<span class='list-item-name'>" + item + "</span>");
        }
    }

    showMessage(message) {
        let $message = $('#message');
        $message.toggle().find('.text').text(message);
        $message.find('.button-submit').click(function() {
            $message.toggle();
        });
    }
}
