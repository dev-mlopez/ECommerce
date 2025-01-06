const error404 = (req, res) => {
    res
        .status(404)
        .render("error", {
            title: "Error 404 NotFound", 
            message:"El recurso que estás buscando no existe."
        });
};

module.exports = {
    error404,
}