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
            $("#list-" + type + " > .list").append("<div id='" + item + "' class='item-row'><span class='item-name'>" + type + " name: " + item + "</span></div>");
            let itemAttrs = objects[item];
            for (let attr in itemAttrs) {
                $("#" + item).append("<span class='item-attr'>" + attr + " : " + itemAttrs[attr] + "</span>");
            }
        }
    }
}
