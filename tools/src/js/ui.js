class UI {
    constructor() {
        this.navbar();
        this.formWatch();
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

    formWatch() {
        $("form").submit(function(event) {
            event.preventDefault();
            let type = $(event.currentTarget).find(".button-submit").attr("id").substring(7);
            let formData = $(this).serializeArray();
            Tools.fbServices.processFormData(formData, type);
        });
    }

    updateList(type, objects) {
        for (let item in objects) {
            let $itemID = $("#" + item),
                itemAttrs = objects[item];

            if ($itemID.length === 0) {
                $("#list-" + type + " > .list").append("<div id='" + item + "' class='item-row'></div>");
                $itemID = $("#" + item);
            } else {
                $itemID.html("");
            }
            $itemID.append("<span class='item-name'>" + type + " name: " + item + "</span>");
            for (let attr in itemAttrs) {
                $itemID.append("<span class='item-attr'>" + attr + " : " + itemAttrs[attr] + "</span>");
            }
        }
    }
}
