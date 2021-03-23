class Helpers {
    constructor() {}

    capitalize(list) {
        let capList = [];
        let newList = list;

        if (typeof list === 'string') {
            newList = [list];
        } else if (list.length === undefined) { // if list is an object
            newList = Object.values(list);
        }
        newList.forEach((item) => {
            capList.push(item[0].toUpperCase() + item.slice(1));
        });
        return capList;
    }
}

export { Helpers };
